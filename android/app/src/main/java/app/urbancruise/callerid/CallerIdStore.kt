package app.urbancruise.callerid

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import android.database.sqlite.SQLiteStatement
import org.json.JSONArray
import org.json.JSONObject

/**
 * The caller-ID list on this phone: one row per phone number of a
 * customer, vendor, driver or UC staff member.
 *
 * Plain SQLite in the app's private storage, so Kotlin can read it when
 * React Native is not running (app closed, removed from recents). The
 * call-screening service looks numbers up here; it never calls the
 * network.
 *
 * Written only by the React Native sync (CallerIdModule.replaceAll), which
 * replaces the WHOLE list in one transaction: a deleted, merged or changed
 * record simply isn't in the next list. If anything fails mid-way the
 * transaction rolls back and the previous list stays.
 *
 * Holds only what the card shows. Deleted on logout and when the server
 * says the staff member is no longer Active.
 *
 * SCHEMA HISTORY
 *   1 (23 Nov 2026)  customers only: phone, name, type, city
 *   2 (24 Nov 2026)  + kind, subtitle, department, branch, badge.
 *                    Upgrading drops the old list and its version, so the
 *                    next sync downloads the full new list.
 */
class CallerIdStore private constructor(context: Context) :
    SQLiteOpenHelper(context.applicationContext, DB_NAME, null, DB_VERSION) {

  /** One person. Field meaning per kind: see the backend's CallerIdContact. */
  data class Entry(
      /** 'customer' | 'vendor' | 'driver' | 'staff' */
      val kind: String,
      val name: String,
      val subtitle: String?,
      /** Customers only: 'personal' | 'corporate' | 'agent'. */
      val type: String?,
      val city: String?,
      /** Staff only: 'Sales · Tele-Sales'. */
      val department: String?,
      /** Staff only: 'Mumbai Office'. */
      val branch: String?,
      /** Small tag next to the name, e.g. 'Inactive'. */
      val badge: String?,
  )

  data class Status(val count: Int, val version: String?, val syncedAt: String?)

  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL(
        "CREATE TABLE entries (" +
            "phone TEXT PRIMARY KEY NOT NULL, " +
            "kind TEXT NOT NULL, " +
            "name TEXT NOT NULL, " +
            "subtitle TEXT, " +
            "type TEXT, " +
            "city TEXT, " +
            "department TEXT, " +
            "branch TEXT, " +
            "badge TEXT)",
    )
    db.execSQL("CREATE TABLE meta (k TEXT PRIMARY KEY NOT NULL, v TEXT)")
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    // The list is a cache of the server: rebuild it on any schema change.
    // Dropping meta also drops the stored version, so the next sync gets
    // the full list instead of a 304.
    db.execSQL("DROP TABLE IF EXISTS entries")
    db.execSQL("DROP TABLE IF EXISTS meta")
    onCreate(db)
  }

  override fun onDowngrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    // An older app build installed over this one: same rule, rebuild.
    onUpgrade(db, oldVersion, newVersion)
  }

  /** The person for an E.164 number, or null. */
  fun lookup(phoneE164: String): Entry? =
      readableDatabase
          .rawQuery(
              "SELECT kind, name, subtitle, type, city, department, branch, badge " +
                  "FROM entries WHERE phone = ? LIMIT 1",
              arrayOf(phoneE164),
          )
          .use { c ->
            if (!c.moveToFirst()) {
              null
            } else {
              fun str(i: Int): String? = if (c.isNull(i)) null else c.getString(i)
              Entry(
                  kind = c.getString(0),
                  name = c.getString(1),
                  subtitle = str(2),
                  type = str(3),
                  city = str(4),
                  department = str(5),
                  branch = str(6),
                  badge = str(7),
              )
            }
          }

  /**
   * Replaces the whole list. [entriesJson] is the server's `entries` array
   * (GET /uc/caller-id/contacts) as a JSON string. Returns the number of
   * rows written.
   */
  fun replaceAll(version: String, entriesJson: String, syncedAt: String): Int {
    val array = JSONArray(entriesJson)
    val db = writableDatabase
    var written = 0
    db.beginTransaction()
    try {
      db.delete("entries", null, null)
      val insert =
          db.compileStatement(
              "INSERT OR REPLACE INTO entries " +
                  "(phone, kind, name, subtitle, type, city, department, branch, badge) " +
                  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
      // ~12,000 rows: one compiled statement inside one transaction keeps
      // this to well under a second on a mid-range phone.
      for (i in 0 until array.length()) {
        val o = array.optJSONObject(i) ?: continue
        // Re-check the format: only rows the lookup can ever match.
        val phone = CallerIdNumber.toE164(o.optString("phone")) ?: continue
        val name = o.optString("name").trim()
        if (name.isEmpty()) continue
        // A kind this build doesn't know (added on the server later) is
        // skipped rather than shown with the wrong card.
        val kind = o.optStringOrNull("kind") ?: continue
        if (kind !in KNOWN_KINDS) continue
        insert.clearBindings()
        insert.bindString(1, phone)
        insert.bindString(2, kind)
        insert.bindString(3, name)
        bindNullable(insert, 4, o.optStringOrNull("subtitle"))
        bindNullable(insert, 5, o.optStringOrNull("type"))
        bindNullable(insert, 6, o.optStringOrNull("city"))
        bindNullable(insert, 7, o.optStringOrNull("department"))
        bindNullable(insert, 8, o.optStringOrNull("branch"))
        bindNullable(insert, 9, o.optStringOrNull("badge"))
        insert.executeInsert()
        written++
      }
      insert.close()
      putMeta(db, KEY_VERSION, version)
      putMeta(db, KEY_SYNCED_AT, syncedAt)
      db.setTransactionSuccessful()
    } finally {
      db.endTransaction()
    }
    return written
  }

  /** The server said "no change" (304): only the check time moves. */
  fun markChecked(syncedAt: String) {
    putMeta(writableDatabase, KEY_SYNCED_AT, syncedAt)
  }

  /** Deletes every row and the sync state. */
  fun clear() {
    val db = writableDatabase
    db.beginTransaction()
    try {
      db.delete("entries", null, null)
      db.delete("meta", null, null)
      db.setTransactionSuccessful()
    } finally {
      db.endTransaction()
    }
  }

  fun status(): Status {
    val db = readableDatabase
    val count =
        db.rawQuery("SELECT COUNT(*) FROM entries", null).use { c ->
          if (c.moveToFirst()) c.getInt(0) else 0
        }
    return Status(count, getMeta(db, KEY_VERSION), getMeta(db, KEY_SYNCED_AT))
  }

  private fun putMeta(db: SQLiteDatabase, key: String, value: String) {
    val values = ContentValues().apply {
      put("k", key)
      put("v", value)
    }
    db.insertWithOnConflict("meta", null, values, SQLiteDatabase.CONFLICT_REPLACE)
  }

  private fun getMeta(db: SQLiteDatabase, key: String): String? =
      db.rawQuery("SELECT v FROM meta WHERE k = ? LIMIT 1", arrayOf(key)).use { c ->
        if (c.moveToFirst() && !c.isNull(0)) c.getString(0) else null
      }

  private fun bindNullable(stmt: SQLiteStatement, index: Int, value: String?) {
    if (value == null) stmt.bindNull(index) else stmt.bindString(index, value)
  }

  /** org.json returns the string "null" for JSON null; treat it as missing. */
  private fun JSONObject.optStringOrNull(key: String): String? {
    if (!has(key) || isNull(key)) return null
    val v = optString(key).trim()
    return v.ifEmpty { null }
  }

  companion object {
    private const val DB_NAME = "caller_id.db"
    private const val DB_VERSION = 2
    private const val KEY_VERSION = "version"
    private const val KEY_SYNCED_AT = "synced_at"

    /** Kinds this build can draw a card for. */
    private val KNOWN_KINDS = setOf("customer", "vendor", "driver", "staff")

    @Volatile private var instance: CallerIdStore? = null

    fun get(context: Context): CallerIdStore =
        instance
            ?: synchronized(this) {
              instance ?: CallerIdStore(context).also { instance = it }
            }
  }
}
