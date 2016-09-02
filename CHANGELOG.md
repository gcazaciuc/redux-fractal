## 1.3
- Stores are now shareable among all components that have the same `key`
- Pass in the component context to all of callback style functions defined on `local`.
  Configuration now can be defined as
  ```js
  local({
      key: (props, context) => ...,
      createStore: (props, existingState, context) => ...
      persist: (props, context) => ...
  })
  ```
- Add the `mergeReducers` utility in 'redux-fractal/utils'
- Renamed 'triggerComponentKey' and 'currentComponentKey' set on actions meta by 
  `redux-fractal` to reduxFractalTriggerComponent and reduxFractalCurrentComponent to prevent
  name collisions with user code.
- Documentation improvements

## 1.2

- Made the `persist` flag configurable by being able to define it also as a function of props

## 1.1

- Add ability to persist state when component unmounts by configuring `local` HOC with a `persist` boolean flag

## 1.0.0

- Initial release
