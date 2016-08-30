import { takeEvery, takeLatest } from 'redux-saga'
import { call, put, select } from 'redux-saga/effects'
const getUser = (userId, sort) => ({ username: 'test', id: userId, sort: sort });

function* fetchUser(action) {
   const compState = yield select();
   try {
      const user = yield call(getUser, action.payload, compState.sort);
      yield put({type: "USER_FETCH_SUCCEEDED", payload: user});
   } catch (e) {
      yield put({type: "USER_FETCH_FAILED", payload: e.message});
   }
}

function* mySaga() {
  yield* takeEvery("USER_FETCH_REQUESTED", fetchUser);
}

export default mySaga;
