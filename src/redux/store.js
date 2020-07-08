import React, { useState, useMemo } from 'react';
import {createBrowserHistory, createHashHistory} from 'history'
import { createStore, combineReducers, compose, applyMiddleware } from 'redux';
import {connectRouter} from 'connected-react-router'
import thunk from 'redux-thunk';
import * as qs from 'query-string';

import * as ActionTypes from './actionTypes';
//import fetchival from 'fetchival';

export const history = createBrowserHistory();//createBrowserHistory();//


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
        }break;
    }
    return state
}

const appReducers = combineReducers({
    router: connectRouter(history),
    columns: columnReducer,
    groups: groupReducer,
})
const enhancer = compose(
    applyMiddleware(
        thunk,
    ),
)

const store = createStore(
    appReducers,
    enhancer
)
export default store;