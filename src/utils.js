// eslint-disable-next-line
export const mergeReducers = (...reducers) => {
  const reversedReducers = reducers.slice(0).reverse();
  return (state, action) => {
    let nextState = state || {};
    reversedReducers.forEach((reducer) => {
      if (typeof state === 'undefined') {
                // The reducers are being initilized by Redux. Give them a chance to return their
                // initial default value and merge all the values together for form the final state
        nextState = Object.assign({}, nextState, reducer(undefined, action));
      } else {
        nextState = reducer(nextState, action);
      }
    });
    return nextState;
  };
};
