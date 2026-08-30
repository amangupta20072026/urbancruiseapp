/**
 * ------------------------------------------------------------------
 * Typed Redux hooks
 * ------------------------------------------------------------------
 * Use these instead of the raw useDispatch / useSelector everywhere.
 * ------------------------------------------------------------------
 */

import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { AppDispatch, RootState } from '.';

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;