package app.urbancruise.callerid

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray

/**
 * The caller-ID list on this phone: one row per customer phone number.
 *
 * Plain SQLite in the app's private storage, so Kotlin can read it when
 * React Native is not running (app closed, removed from recents). The
 * call-screening service looks numbers up here; it never calls the
 * network.
 *
 * Written only by the React Native sync (CallerIdModule.replaceAll), which
 * replaces the WHOLE list in one transaction: a deleted, merged or changed
 * customer simply isn't in the next snapshot. If anything fails mid-way
 * the transaction rolls back and the previous list stays.
 *
 * Holds only what the card shows: number, name, type, city. Deleted on
 * logout and when the server says the staff member is no longer Active.
 */
class CallerIdStore private constructor(context: Context) :
    SQLiteOpenHelper(context.applicationContext, DB_NAME, null, DB_VERSION) {

  data class Entry(val name: String, val type: String?, val city: String?)

  data class Status(val count: Int, val version: String?, val syncedAt: String?)

  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL(
        "CREATE TABLE entries (" +
            "phone TEXT PRIMARY KEY NOT NULL, " +
            "name TEXT NOT NULL, " +
            "type TEXT, " +
            "city TEXT)",
    )
    db.execSQL("CREATE TABLE meta (k TEXT PRIMARY KEY NOT NULL, v TEXT)")
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    // The list is a cache of the server: rebuild it on any schema change.
    db.execSQL("DROP TABLE IF EXISTS entries")
    db.execSQL("DROP TABLE IF EXISTS meta")
    onCreate(db)
  }

  /** The customer for an E.164 number, or null. */
  fun lookup(phoneE164: String): Entry? =
      readableDatabase
          .rawQuery(
              "SELECT name, type, city FROM entries WHERE phone = ? LIMIT 1",
              arrayOf(phoneE164),
          )
          .use { c ->
            if (!c.moveToFirst()) {
              null
            } else {
              Entry(
                  name = c.getString(0),
                  type = if (c.isNull(1)) null else c.getString(1),
                  city = if (c.isNull(2)) null else c.getString(2),
              )
            }
          }

  /**
   * Replaces the whole list. [entriesJson] is the server's `entries` array
   * as a JSON string. Returns the number of rows written.
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
              "INSERT OR REPLACE INTO entries (phone, name, type, city) VALUES (?, ?, ?, ?)",
          )
      // ~12,000 rows: one compiled statement inside one transaction keeps
      // this to well under a second on a mid-range phone.
      for (i in 0 until array.length()) {
        val o = array.optJSONObject(i) ?: continue
        // Re-check the format: only rows the lookup can ever match.
        val phone = CallerIdNumber.toE164(o.optString("phone")) ?: continue
        val name = o.optString("name").trim()
        if (name.isEmpty()) continue
        insert.clearBindings()
        insert.bindString(1, phone)
        insert.bindString(2, name)
        bindNullable(insert, 3, o.optStringOrNull("type"))
        bindNullable(insert, 4, o.optStringOrNull("city"))
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

  /** Deletes every customer row and the sync state. */
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

  private fun bindNullable(
      stmt: android.database.sqlite.SQLiteStatement,
      index: Int,
      value: String?,
  ) {
    if (value == null) stmt.bindNull(index) else stmt.bindString(index, value)
  }

  /** org.json returns the string "null" for JSON null; treat it as missing. */
  private fun org.json.JSONObject.optStringOrNull(key: String): String? {
    if (!has(key) || isNull(key)) return null
    val v = optString(key).trim()
    return v.ifEmpty { null }
  }

  companion object {
    private const val DB_NAME = "caller_id.db"
    private const val DB_VERSION = 1
    private const val KEY_VERSION = "version"
    private const val KEY_SYNCED_AT = "synced_at"

    @Volatile private var instance: CallerIdStore? = null

    fun get(context: Context): CallerIdStore =
        instance
            ?: synchronized(this) {
              instance ?: CallerIdStore(context).also { instance = it }
            }
  }
}
