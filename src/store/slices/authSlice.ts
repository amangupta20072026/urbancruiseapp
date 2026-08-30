// /**
//  * ------------------------------------------------------------------
//  * Auth Slice — Identity ONLY (not tokens)
//  * ------------------------------------------------------------------
//  * Tokens live in Keychain (services/storage/secureStorage.ts).
//  * This slice holds identity info for the UI to react to.
//  *
//  * Coexists with appSlice — appSlice keeps the existing
//  * isAuthenticated + userRole for backwards compat with RootNavigator.
//  * ------------------------------------------------------------------
//  */

// import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
// import type { UserRole, SubRole } from '@rbac/roles';

// export type AuthState = {
//   userId: string | null;
//   userRole: UserRole | null;
//   subRole: SubRole;
//   entityId: string | null;
// };

// const initialState: AuthState = {
//   userId: null,
//   userRole: null,
//   subRole: null,
//   entityId: null,
// };

// const authSlice = createSlice({
//   name: 'auth',
//   initialState,
//   reducers: {
//     userAuthenticated: (
//       state,
//       action: PayloadAction<{
//         userId: string;
//         userRole: UserRole;
//         subRole: SubRole;
//         entityId: string;
//       }>,
//     ) => {
//       state.userId = action.payload.userId;
//       state.userRole = action.payload.userRole;
//       state.subRole = action.payload.subRole;
//       state.entityId = action.payload.entityId;
//     },
//     userLoggedOut: () => initialState,
//   },
// });

// export const { userAuthenticated, userLoggedOut } = authSlice.actions;
// export default authSlice.reducer;

// // -----------------------------------------------------------------
// // Selectors — prefixed with `select` per Redux style guide
// // -----------------------------------------------------------------
// import type { RootState } from '@store';

// export const selectAuth = (state: RootState) => state.auth;
// export const selectUserId = (state: RootState) => state.auth.userId;
// export const selectUserRole = (state: RootState) => state.auth.userRole;
// export const selectSubRole = (state: RootState) => state.auth.subRole;
// export const selectEntityId = (state: RootState) => state.auth.entityId;
// // 