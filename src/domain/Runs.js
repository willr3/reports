import React, { useState, useRef, useMemo, useEffect } from 'react';

import { useHistory, useParams, useLocation } from "react-router"
import { useDispatch, useSelector, useStore } from 'react-redux'
import * as qs from 'query-string';
import {
    Button,
    Card,
    CardHead,
    CardHeadMain,
    CardHeadActions,
    CardBody,
    Nav,
    NavGroup,
    NavItem,
    NavItemSeparator,
    NavList,
    NavVariants,
    Page,
    PageHeader,
    PageSection,
    PageSidebar,
    Title,
    Toolbar,
    ToolbarGroup,
    ToolbarItem,
} from '@patternfly/react-core';
import { NavLink } from 'react-router-dom';
import * as actions from '../redux/actions';
import Table from '../components/Table'
import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
import { DateTime } from 'luxon';


// global.DateTime = DateTime;
// global.jsonpath = jsonpath;

const DEFAULT_GROUP = ""

// runs on the datase to create the summary json for each entry
const accessors = {
    coldStart: {
        start: `$.qdup.run.timestamps.start`,
        duration: `(json)=>{
            const start = jsonpath.value(json,"$.qdup.run.timestamps.start")
            const stop = jsonpath.value(json,"$.qdup.run.timestamps.stop")
            const rtrn = DateTime.fromMillis(stop).diff(DateTime.fromMillis(start)).toFormat("hh:mm:ss")
            return rtrn;
        }`,
        times: "$.qdup.run.state.time.length",
    },
    techempower: {
        start: `$.startTime`,
        stop: `$.completionTime`,
        id: `$.name`,
        frameworks: `$.frameworks`,
        tests: `(json) => (Object.entries(json.rawData).filter(v=>v[0]!=="commitCounts" && v[0]!=="slocCounts" && Object.getOwnPropertyNames(v[1]).length > 0).map(v=>v[0]))`,
    },
    hyperfoil: {
        failureCount: `$.hyperfoil.failures.length`,
        start: `$.hyperfoil.info.startTime`,
        stop: `$.hyperfoil.info.terminateTime`,
        version: `$.hyperfoil.version`,
        agentCount: `$.hyperfoil.agents.length`,
        statCount: `$.hyperfoil.stats.length`
    },
    webProfile: {
        scale: `$.faban.run.SPECjEnterprise['fa:runConfig']['fa:scale']['text()']`,
        fabanId: `$.qdup.state.FABAN_RUN_ID`,
        start: `$.qdup.timestamps.start`,
        files: `$.files..name`,
        times: `(json) => (
            jsonpath.value(json, "$.faban.run.SPECjEnterprise['fa:runConfig']['fa:runControl']['fa:rampUp']['text()']") +
            ":" + jsonpath.value(json, "$.faban.run.SPECjEnterprise['fa:runConfig']['fa:runControl']['fa:steadyState']['text()']") +
            ":" + jsonpath.value(json, "$.faban.run.SPECjEnterprise['fa:runConfig']['fa:runControl']['fa:rampDown']['text()']"))`
        ,
        url: `$.qdup.state.RUNTIME_URL`,
        runtimeName: `$.qdup.state.RUNTIME_NAME`,
        stop: `$.qdup.timestamps.start`,
    },
    specjEnterprise: {
        scale: `$.faban.run.SPECjEnterprise['fa:runConfig']['fa:scale']['text()']`,
        fabanId: `$.qdup.state.FABAN_RUN_ID`,
        start: `$.qdup.timestamps.start`,
        files: `$.files..name`,
        times: `(json) => (
            jsonpath.value(json, "$.faban.run.SPECjEnterprise['fa:runConfig']['fa:runControl']['fa:rampUp']['text()']") +
            ":" + jsonpath.value(json, "$.faban.run.SPECjEnterprise['fa:runConfig']['fa:runControl']['fa:steadyState']['text()']") +
            ":" + jsonpath.value(json, "$.faban.run.SPECjEnterprise['fa:runConfig']['fa:runControl']['fa:rampDown']['text()']"))`
        ,
        url: `$.qdup.state.RUNTIME_URL`,
        runtimeName: `$.qdup.state.RUNTIME_NAME`,
        stop: `$.qdup.timestamps.start`,
    },
    createNamespace: {
        start: `$.qdup.run.timestamps.start`,
        stop: `$.qdup.run.timestamps.stop`,
        duration: `(json)=>{
            const start = jsonpath.value(json,"$.qdup.run.timestamps.start")
            const stop = jsonpath.value(json,"$.qdup.run.timestamps.stop")
            const rtrn = DateTime.fromMillis(stop).diff(DateTime.fromMillis(start)).toFormat("hh:mm:ss")
            return rtrn;
        }`,
        times: "$.qdup.run.state.time.length",
        namespaces: `$.qdup.run.state.NAMESPACE_COUNT`,
        services: `$.qdup.run.state.SERVICE_COUNT`,
        lastServiceStop: `(json) => {
            const ary = json.qdup.run.profiles["scalelab-setup@f03-h01-000-r620"].timers
                .filter(timer=>
                    timer.name.startsWith("Sh-await-callback") && 
                    timer.name.includes("serving.knative.dev/v1alpha1")
                );
            return ary[ary.length-1].stop
        }`,
        createNamespace: `(json) => (
            json.qdup.run.profiles["scalelab-setup@f03-h01-000-r620"].timers
                .filter(timer=>
                    timer.name.startsWith("Sh-await-callback") && 
                    timer.name.includes("kind: Namespace")
                ).length
        )`,
        createService: `(json) => (
            json.qdup.run.profiles["scalelab-setup@f03-h01-000-r620"].timers
                .filter(timer=>
                    timer.name.startsWith("Sh-await-callback") && 
                    timer.name.includes("serving.knative.dev/v1alpha1")
                ).length
        )`,
        files: `$.files..name`,
    }
};

export default () => {
    const { groupId = DEFAULT_GROUP } = useParams();
    const [showNav, setShowNav] = useState(false);
    const dispatch = useDispatch();
    const reports = {
        hyperfoil: 'hyperfoil',
        createNamespace: 'namespace',
        webProfile: 'web',
        specjEnterprise: 'specj',
        techempower: 'techempower',
        coldStart: 'coldStart'
    }

    const columns = {
        coldStart: [
            { Header: "name", accessor: "file" },
            {
                Header: "start",
                accessor: "data.start",
                Cell: (arg) => {
                    const { cell: { value } } = arg
                    return value ? (DateTime.fromMillis(value).toFormat("yyyy-MM-dd HH:mm:ss")) : "--"
                }
            },
            { Header: "duration", accessor: "data.duration" },
            { Header: "curls", accessor: "data.times" },
        ],
        techempower: [
            { Header: 'id', accessor: "data.id" },
            {
                Header: 'start', accessor: ({ data: { start, stop } }, rowIndex) => {
                    console.log("start", start, data)
                    return DateTime.fromMillis(start).toFormat("yyyy-MM-dd HH:mm:ss")
                }
            },
            // {Header: 'stop', accessor: ({data: {start, stop}},rowIndex) => DateTime.fromMillis(stop).toFormat("HH:mm:ss") },
            {
                Header: 'duration', accessor: ({ data: { start, stop } }, rowIndex) => {
                    console.log("duration", { start, stop }, start instanceof Number, stop instanceof Number)
                    return DateTime.fromMillis(stop).diff(DateTime.fromMillis(start)).toFormat("hh:mm:ss")
                }
            },
            {
                Header: 'frameworks', accessor: "data.frameworks",
                Cell: (arg) => {
                    const { cell: { value } } = arg
                    const toRender = Array.isArray(value) ? value : [value]
                    return value.map((v, i) => (<span key={i} className="pf-c-badge pf-m-read">{v}</span>))
                }
            },
            {
                Header: 'tests', accessor: "data.tests",
                Cell: (arg) => {
                    const { cell: { value } } = arg
                    const toRender = Array.isArray(value) ? value : [value]
                    return value.map((v, i) => (<span key={i} className="pf-c-badge pf-m-read">{v}</span>))
                }
            }
        ],
        hyperfoil: [
            {
                Header: "name", accessor: "file",
                Cell: (arg) => {
                    const { cell: { value } } = arg
                    return (
                        <NavLink exact={true} to={`/report/hyperfoil?q=${value}`} activeClassName="pf-m-current">
                            {value}
                        </NavLink>
                    )
                }
            },
            {
                Header: "duration", accessor: (originalRow, rowIndex) => {
                    const { data: { start, stop } } = originalRow
                    return DateTime.fromMillis(stop).diff(DateTime.fromMillis(start)).toFormat("hh:mm:ss")
                }
            },
            { Header: "version", accessor: "data.version" },
            { Header: "agents", accessor: "data.agentCount" },
            { Header: "stats", accessor: "data.statCount" },
            { Header: "failures", accessor: "data.failureCount" },

        ],
        createNamespace: [
            {
                Header: "name", accessor: "file",
                Cell: (arg) => {
                    const { cell: { value } } = arg
                    return (
                        <NavLink exact={true} to={`/report/namespace?q=${value}`} activeClassName="pf-m-current">
                            {value}
                        </NavLink>
                    )
                }
            },
            // {Header:"start",accessor:"data.start",
            //     Cell:(arg)=>{
            //         const { cell: {value} } = arg
            //         return (DateTime.fromMillis(value).toFormat("yyyy-MM-dd HH:mm:ss"))
            //     }
            // },
            // {Header:"stop",accessor:"data.stop",
            //     Cell:(arg)=>{
            //         const { cell: {value} } = arg
            //         return (DateTime.fromMillis(value).toFormat("yyyy-MM-dd HH:mm:ss"))
            //     }
            // },
            {
                Header: 'start', accessor: ({ data: { start, stop } }, rowIndex) => {
                    console.log("start", start, data)
                    return DateTime.fromMillis(start).toFormat("yyyy-MM-dd HH:mm:ss")
                }
            },
            {
                Header: 'stop', accessor: ({ data: { start, stop } }, rowIndex) => {
                    return DateTime.fromMillis(stop).toFormat("yyyy-MM-dd HH:mm:ss")
                }
            },
            { Header: "duration", accessor: "data.duration" },
            { Header: "curls", accessor: "data.times" },
            { Header: "target namespaces", accessor: "data.namespaces" },
            { Header: "service/namespace", accessor: "data.services" },
            { Header: "created namespaces", accessor: "data.createNamespace" },
            { Header: "created services", accessor: "data.createService" },
            {
                Header: 'lastService', accessor: ({ data: { start, stop, lastServiceStop } }, rowIndex) => {
                    console.log("lastServiceStop", lastServiceStop, data)
                    return DateTime.fromMillis(lastServiceStop).toFormat("yyyy-MM-dd HH:mm:ss")
                }
            },

        
        ],
        webProfile: [
            {
                Header: "name", accessor: "file",
                Cell: (arg) => {
                    const { cell: { value } } = arg
                    return (
                        <a
                            href={`http://benchserver1.perf.lab.eng.rdu2.redhat.com:8888/blue/organizations/jenkins/qdup/detail/qdup/${value}/artifacts`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {value}
                        </a>
                    )
                }
            },
            { Header: "runtime", accessor: "data.runtimeName" },
            { Header: "scale", accessor: "data.scale" },
            {
                Header: "faban", accessor: "data.fabanId",
                Cell: (arg) => {
                    const { cell: { value } } = arg
                    return (
                        <a
                            href={`http://benchclient1.perf.lab.eng.rdu2.redhat.com:9980/resultframe.jsp?runId=${value}&result=summary.xml`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >{value.substring(value.lastIndexOf('.') + 1)}</a>
                    )
                }
            },
            {
                Header: "start",
                accessor: "data.start",
                Cell: (arg) => {
                    const { cell: { value } } = arg

                    return value ? (DateTime.fromMillis(value).toFormat("yyyy-MM-dd HH:mm:ss")) : "--"
                }
            },
            { Header: "times", accessor: "data.times" },
            {
                Header: "files", accessor: "data.files", disableSortBy: true,
                Cell: (arg) => {
                    const { cell: { value }, row: { original } } = arg
                    const toRender = Array.isArray(value) ? value : [value]
                    return (<>
                        {toRender.map((entry, index) => (
                            <div key={index}>
                                <a
                                    href={`http://benchserver1.perf.lab.eng.rdu2.redhat.com:8888/job/qdup/${original.file}/artifact/run/benchserver4.perf.lab.eng.rdu2.redhat.com/${entry}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {entry}
                                </a>
                            </div>
                        ))}
                    </>)
                }
            },
        ],
        specjEnterprise: [
            {
                Header: "name", accessor: "file",
                Cell: (arg) => {
                    const { cell: { value } } = arg
                    return (
                        <a
                            href={`http://benchserver1.perf.lab.eng.rdu2.redhat.com:8888/blue/organizations/jenkins/qdup/detail/qdup/${value}/artifacts`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {value}
                        </a>
                    )
                }
            },
            { Header: "runtime", accessor: "data.runtimeName" },
            { Header: "scale", accessor: "data.scale" },
            {
                Header: "faban", accessor: "data.fabanId",
                Cell: (arg) => {
                    const { cell: { value } } = arg
                    const name = value ? (value.substring(value.lastIndexOf('.') + 1)) : "--"
                    return (
                        <a
                            href={`http://benchclient1.perf.lab.eng.rdu2.redhat.com:9980/resultframe.jsp?runId=${value}&result=summary.xml`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >{name}</a>
                    )
                }
            },
            {
                Header: "start",
                accessor: "data.start",
                Cell: (arg) => {
                    const { cell: { value } } = arg
                    return value ? (DateTime.fromMillis(value).toFormat("yyyy-MM-dd HH:mm:ss")) : "--"
                }
            },
            { Header: "times", accessor: "data.times" },
            {
                Header: "files", accessor: "data.files", disableSortBy: true,
                Cell: (arg) => {
                    const { cell: { value }, row: { original } } = arg
                    const toRender = Array.isArray(value) ? value : [value]
                    return (<>
                        {toRender.map((entry, index) => (
                            <div key={index}>
                                <a
                                    href={`http://benchserver1.perf.lab.eng.rdu2.redhat.com:8888/job/qdup/${original.file}/artifact/run/benchserver4.perf.lab.eng.rdu2.redhat.com/${entry}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {entry}
                                </a>
                            </div>
                        ))}
                    </>)
                }
            },
        ]
    }
    const [selectedRows, setSelectedRows] = useState({});
    const [orderedRows, setOrderedRows] = useState([]);
    const data = useSelector(state => {
        return state.groups[groupId] || []
    });
    console.log("data", data)

    //this fires before useEffect takes place, need to detect when groupId and data are out of sync
    const qStr = useMemo(() => {
        if (orderedRows.length > 0 && data.length >= orderedRows.length /*store.getState().groups.hasOwnProperty(groupId)*/) {
            return qs.stringify({ q: orderedRows.map(index => data[index].file) })
        } else {
            return ""
        }
    }, [orderedRows])//removed data,groupId so this only triggers after useEffect updates selectedRows

    useEffect(() => {
        const selectedKeys = Object.keys(selectedRows);
        if (selectedKeys.length !== orderedRows.length) {
            const removedMissing = orderedRows.filter(v => selectedRows.hasOwnProperty(v))
            selectedKeys.forEach(key => {
                if (!removedMissing.includes(key)) {
                    removedMissing.push(key)
                }
            })
            setOrderedRows(removedMissing)
        }
    }, [selectedRows, setOrderedRows])

    useEffect(() => {
        setSelectedRows({})
        setOrderedRows([])
        dispatch(
            actions.fetchGroup(groupId, accessors[groupId] || {}))
    }, [groupId])
    const Header = (
        <PageHeader
            toolbar={
                <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                    <ToolbarGroup>
                        <ToolbarItem>
                            <Button component="a" target="_blank" href={`/report/${reports[groupId]}?${qStr}`} variant="primary" isDisabled={Object.keys(selectedRows).length == 0}>
                                report {Object.keys(selectedRows).length > 0 ? Object.keys(selectedRows).length : ''}
                            </Button>
                        </ToolbarItem>
                    </ToolbarGroup>
                </Toolbar>
            }
            logo=""
            //toolbar=""
            avatar=""
            topNav=""
            showNavToggle={true}
            isNavOpen={showNav}
            onNavToggle={() => { setShowNav(!showNav) }}
        />
    )
    const Navigation = (
        <Nav aria-label="Nav" theme="dark">
            <NavList>
                <NavGroup title="EnterpriseApplicationServer">
                    <NavItem itemId={0} isActive={false}>
                        <NavLink exact={true} to="/specjEnterprise" activeClassName="pf-m-current">
                            specjEnterprise2010
                        </NavLink>
                    </NavItem>
                    <NavItem itemId={0} isActive={false}>
                        <NavLink exact={true} to="/webProfile" activeClassName="pf-m-current">
                            webProfile
                        </NavLink>
                    </NavItem>
                </NavGroup>
                <NavGroup title="Openshift Serverless">
                    <NavItem itemId={0} isActive={false}>
                        <NavLink exact={true} to="/coldStart" activeClassName="pf-m-current">
                            cold start
                        </NavLink>
                    </NavItem>
                    <NavItem itemId={0} isActive={false}>
                        <NavLink exact={true} to="/createNamespace" activeClassName="pf-m-current">
                            create namespaces
                        </NavLink>
                    </NavItem>
                </NavGroup>
                <NavGroup title="Testing">
                    <NavItem itemId={0} isActive={false}>
                        <NavLink exact={true} to="/hyperfoil" activeClassName="pf-m-current">
                            hyperfoil
                        </NavLink>
                    </NavItem>
                    <NavItem itemId={0} isActive={false}>
                        <NavLink exact={true} to="/techempower" activeClassName="pf-m-current">
                            techempower
                        </NavLink>
                    </NavItem>
                </NavGroup>
            </NavList>
        </Nav>
    )
    const Sidebar = (
        <PageSidebar nav={Navigation} isNavOpen={showNav} theme="dark" />
    )
    const renderRowSubComponent = React.useCallback(
        ({ row }) => (
            <div className="pf-c-content">
                <div key="url" style={{ fontSize: '85%' }}>{row.original.data.url}</div>
                {(Array.isArray(row.original.data.files) ? row.original.data.files : [row.original.data.files]).map((fileName, fileIndex) => (<div key={"file-" + fileIndex} style={{ fontSize: '85%' }}>{fileName}</div>))}
            </div>
        ),
        []
    )
    console.log(groupId,columns,columns[groupId])
    return (
        <Page header={Header} sidebar={Sidebar}>
            <PageSection isFilled={true}>
                {data.length > 0 ?
                    (<Table
                        // header={(rows,selectedRowIds,selectedFlatRows)=>{
                        //     const qStr = qs.stringify({q:selectedFlatRows.map(v=>v.original.file)})
                        //     return (
                        //         <CardHeadMain>
                        //             {selectedFlatRows.length> 0 ?(<NavLink target="_blank" to={`/report/${reports[groupId]}?${qStr}`} className="pf-c-button pf-m-secondary">
                        //                 report {selectedFlatRows.length > 0 ? selectedFlatRows.length : ""}
                        //             </NavLink>):
                        //             <button className="pf-c-button pf-m-secondary" type="button" disabled>report</button>
                        //         }
                        //         </CardHeadMain>
                        //     )
                        // }}
                        //selectedRows={selectedRows}
                        setSelectedRows={setSelectedRows}
                        columns={columns[groupId]||[]}
                        data={data}
                        initialSortBy={[{ id: 'file', desc: true }]}
                        renderRowSubComponent={renderRowSubComponent}
                    />) : null}
            </PageSection>
        </Page>

    )
}