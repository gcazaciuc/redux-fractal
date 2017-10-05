import PropTypes from 'prop-types';
import React from 'react';
import invariant from 'invariant';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { connect } from 'react-redux';
import * as UIActions from './actions.js';
import { createStore } from './localReducer.js';

export default (Config) => (Component) => {
  const defaultMapStateToProps = (state) => state;
  const ConnectComp = connect(
        Config.mapStateToProps || defaultMapStateToProps,
        Config.mapDispatchToProps,
        Config.mergeProps)((props) => {
          const newProps = Object.assign({}, props);
          delete newProps.store;
          // eslint-disable-next-line
          return (<Component {...newProps} />);
        });
  class UI extends React.Component {
    constructor(props, context) {
      super(props, context);
      const compKey = typeof Config.key === 'function' ?
                Config.key(props, context) : Config.key;
      this.store = null;
      invariant(Config.key,
     '[redux-fractal] - You must supply a  key to the component either as a function or string');
      this.compKey = compKey;
      this.unsubscribe = null;
    }
    componentWillMount() {
      const existingState = this.context.store.getState().local[this.compKey];
      const storeResult = createStore(
                Config.createStore, this.props,
                this.compKey, existingState, this.context);
      this.store = storeResult.store;
      this.storeCleanup = storeResult.cleanup;
      this.context.store.dispatch({
        type: UIActions.CREATE_COMPONENT_STATE,
        payload: { config: Config, props: this.props, store: this.store, hasStore: !!Config.createStore },
        meta: { reduxFractalTriggerComponent: this.compKey },
      });
    }
    componentWillUnmount() {
      const persist = typeof Config.persist === 'function' ?
                                Config.persist(this.props, this.context) : Config.persist;
      setTimeout(() => {
        this.context.store.dispatch({
          type: UIActions.DESTROY_COMPONENT_STATE,
          payload: { persist, hasStore: !!Config.createStore },
          meta: { reduxFractalTriggerComponent: this.compKey }
        });
        if (this.storeCleanup) {
          this.storeCleanup();
        }
        this.store = null;
      }, 0);
    }
    render() {
      if (this.props.store) {
        // eslint-disable-next-line
        console.warn(`Props named 'store' cannot be passed to redux-fractal 'local'
                HOC with key ${this.compKey} since it's a reserved prop`);
      }
      return (
                this.store && <ConnectComp
                  {...this.props}
                  store={this.store}
                />
            );
    }
    }

  UI.contextTypes = Object.assign({}, Component.contextTypes, {
    store: PropTypes.shape({
      subscribe: PropTypes.func.isRequired,
      dispatch: PropTypes.func.isRequired,
      getState: PropTypes.func.isRequired,
    }),
  });
  UI.propTypes = Object.assign({}, {
    store: PropTypes.shape({
      subscribe: PropTypes.func.isRequired,
      dispatch: PropTypes.func.isRequired,
      getState: PropTypes.func.isRequired,
    }),
  });
  const displayName = Component.displayName || Component.name || 'Component';
  UI.displayName = `local(${displayName})`;
  return hoistNonReactStatics(UI, Component);
};
