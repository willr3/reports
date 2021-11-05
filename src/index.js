import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux'
import { Route,Routes } from 'react-router'
import { BrowserRouter } from "react-router-dom";

import { ConnectedRouter } from 'connected-react-router'

import './index.css';

import Runs from './domain/Runs';

import Specj from './reports/Specj';
import Web from './reports/Web';
import Namespaces from './reports/Namespace';
import Hyperfoil from './reports/Hyperfoil';
import TechEmpower from './reports/TechEmpower';
import ColdStart from './reports/ColdStart';
import EventingHyperfoil from './reports/EventingHyperfoil';
import ReportBuilder from './ReportBuilder';

import UPlot from './UPlot';

import store, {history} from './redux/store';

import { DateTime } from 'luxon';
import jsonpath from 'jsonpath';

global["DateTime"] = DateTime;
global["jsonpath"] = jsonpath;

if(window){
    const existing = window.onresize;
    window.resizers = [];
    window.onresize=()=>{
        Object.values(window.resizers).forEach(resizer=>{
            resizer();
        })
    }
}
ReactDOM.render(
        <Provider store={store}>
        <BrowserRouter history={history}>
            <Routes>
                <Route path="/report/web" element={<Web/>}/>
                <Route path="/report/specj" element={<Specj/>}/>
                <Route path="/report/namespace" element={<Namespaces/>}/>
                <Route path="/report/hyperfoil" element={<Hyperfoil/>}/>
                <Route path="/report/techempower" element={<TechEmpower/>}/>
                <Route path="/report/coldStart" element={<ColdStart/>}/>
                <Route path="/report/eventingHyperfoil" element={<EventingHyperfoil/>}/>
                <Route path="/test/uplot" element={<UPlot/>}/>
                <Route path="/test/report" element={<ReportBuilder></ReportBuilder>}/>
                <Route path="/:groupId" element={<Runs/>}/>
                <Route path="/" exact element={<Runs/>}/>
            </Routes>
        </BrowserRouter>
        </Provider>
, document.getElementById('root'));
