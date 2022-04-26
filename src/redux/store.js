import {createBrowserHistory} from 'history'
import { createStore, combineReducers, compose, applyMiddleware } from 'redux';

import thunk from 'redux-thunk';

import * as ActionTypes from './actionTypes';

export const history = createBrowserHistory({ window });


const columnReducer = (state = {}, action) =>{
    switch(action.type){

    }
    return state;
}
const groupReducer = (state = {}, action) =>{
    switch(action.type){
        case ActionTypes.GROUP_LOADED: {
            //TODO use immutable
            state[action.groupId] = action.data;
            state = {...state}
        }break;
    }
    return state
}

const appReducers = combineReducers({
//    router: connectRouter(history),
    columns: columnReducer,
    groups: groupReducer,
})
const enhancer = compose(
    applyMiddleware(
        thunk,
//        routerMiddleware(history)
    ),
)
const store = createStore(
    appReducers,
    enhancer
)
export default store;