import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux'
import { Route, Switch } from 'react-router'

import { ConnectedRouter } from 'connected-react-router'


import './index.css';

import Runs from './domain/Runs';

import Specj from './reports/Specj';
import Web from './reports/Web';
import Namespaces from './reports/Namespace';
import Hyperfoil from './reports/Hyperfoil';
import TechEmpower from './reports/TechEmpower';
import ColdStart from './reports/ColdStart';
// import ReportBuilder from './ReportBuilder';

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
        <ConnectedRouter history={history}>
            <Switch>
                <Route path="/report/web" component={Web}/>
                <Route path="/report/specj" component={Specj}/>
                <Route path="/report/namespace" component={Namespaces}/>
                <Route path="/report/hyperfoil" component={Hyperfoil}/>
                <Route path="/report/techempower" component={TechEmpower}/>
                <Route path="/report/coldStart" component={ColdStart}/>
                <Route path="/test/uplot" component={UPlot}/>
                {/* <Route path="/test/report" component={ReportBuilder}/> */}
                <Route path="/:groupId" component={Runs}/>
                <Route path="/" exact component={Runs}/>
            </Switch>
        </ConnectedRouter>
    </Provider>
, document.getElementById('root'));
