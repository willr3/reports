import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import jsonpath from 'jsonpath';
import { DateTime, Duration } from 'luxon'
import * as qs from 'query-string';
import { useHistory, useParams, useLocation } from "react-router"
import {
    Card,

    Nav,
    NavGroup,
    NavList,
    NavItem,
    Page, PageHeader, PageSection, PageSectionVariants, PageSidebar,
    SimpleList,
    SimpleListItem,
    SimpleListGroup,
    Stack,
    StackItem,
    Title,
    Toolbar,
} from '@patternfly/react-core';
import {
    Area,
    Bar,
    BarChart,
    Label,
    Legend,
    ComposedChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    ReferenceArea,
    ReferenceLine,
    ResponsiveContainer,
} from 'recharts';
import { Helmet } from "react-helmet";
//import { AutoSizer } from 'react-virtualized';
import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
import '../App.css';
import reducer, { apply } from '../domain/reducer';
import { getCdf, getBuckets, getStats } from '../domain/stats';
import * as Charts from '../domain/charts';
import { unstable_renderSubtreeIntoContainer } from 'react-dom';
import Table from '../components/Table';
import { fetchSearch } from '../redux/actions';

import ChartContainer from '../components/ChartContainer';
import { chartColors } from '../theme';


const colors = {
    blue: ["#8BC1F7", "#519DE9", "#0066CC", "#004B95", "#002F5D"],
    green: ["#A2D99C", "#88D080", "#6EC664", "#509149", "#3B6C37"],
    purple: ["#CBC0FF", "#B1A3FF", "#A18FFF", "#8476D1", "#6753AC"],
    cyan: ["#8BB4B9", "#5C969D", "#2E7981", "#015C65", "#00434B"],
    gold: ["#F9E0A2", "#F6D173", "#F4C145", "#F0AB00", "#C58C00"],
    orange: ["#F4B678", "#EF9234", "#EC7A08", "#C46100", "#8F4700"]
}
const colorNames = Object.keys(colors)
const colorList = []
for (var i = 0; i < colors[colorNames[0]].length; i++) {
    for (var n = 0; n < colorNames.length; n++) {
        colorList.push(colors[colorNames[n]][i])
    }
}
const strToMs = (v, defaultValue = 0) => {
    const x = /([0-9]+\.?[0-9]*)([mnu]*)s/.exec(v)
    if (x) {
        const val = parseFloat(x[1])
        switch (x[2]) {
            case "": //no unit means seconds
                return val * 1000;
            case "m":
                return val * 1;
            case "u":
                return val / 1000;
            case "n":
                return val / 1000000;
            default:
                return val;
        }
    } else {
        return defaultValue;
    }
}
const pageBreakInside = { pageBreakInside: 'avoid' };
const getTests = (json) => (Object.entries(json.rawData).filter(v => v[0] !== "commitCounts" && v[0] !== "slocCounts" && Object.getOwnPropertyNames(v[1]).length > 0).map(v => v[0]))
function TechEmpower() {
    const [showNav, setShowNav] = useState(false);
    const location = useLocation();
    const [data, setData] = useState([])
    global["data"] = data;

    const getDataName = (v, i, a) => {
        return data[i].name
    }

    const allFrameworks = useMemo(() => [...new Set(data.flatMap(d => jsonpath.query(d, `$.data.frameworks[*]`)))], [data]);
    const allTests = useMemo(() => [...new Set(data.flatMap(v => getTests(v.data)))], [data])

    const CUTOFF = 1

    const frameworkSeries = useMemo(() => {
        const rtrn = data.length > CUTOFF ? allFrameworks.reduce((rtrn, framework) => {
            const entry = reducer(
                data,
                [
                    { id: 'throughput', name: (v, i, a, x) => `${v.test}_${v.framework}_throughput` },
                    { id: 'latencyMax', name: (v, i, a, x) => `${v.test}_${v.framework}_latencyMax` },
                    { id: 'latencyAvg', name: (v, i, a, x) => `${v.test}_${v.framework}_latencyAvg` },
                    { id: 'startTime', name: (v, i, a, x) => `${v.test}_${v.framework}_startTime` },
                    { id: 'latencyStdev', name: (v, i, a, x) => `${v.test}_${v.framework}_latencyStdev` },
                    { id: 'endTime', name: (v, i, a, x) => `${v.test}_${v.framework}_endTime` },
                    { id: 'totalRequests', name: (v, i, a, x) => `${v.test}_${v.framework}_totalRequests` },
                    { id: 'endOffset', name: (v, i, a, x) => `${v.test}_${v.framework}_endOffset` },
                    { id: 'startOffset', name: (v, i, a, x) => `${v.test}_${v.framework}_startOffset` },
                    { id: 'concurrency' }
                ],
                {
                    getName: v => v.name,
                    getDomain: 'concurrency',
                    getSeries: (d, i, a) => {
                        return getTests(d.data).flatMap((test, testIndex) => {
                            return Object.entries(jsonpath.value(d, `$.data.rawData.${test}`)).flatMap(([framework, seriesData]) => {
                                return seriesData.map((e, seriesIndex, x) => ({
                                    test,
                                    ...e,
                                    throughput: (e.totalRequests) / (e.endTime - e.startTime),
                                    concurrency: jsonpath.value(d, `$.data.concurrencyLevels[${seriesIndex}]`),
                                    framework,
                                    latencyMax: strToMs(e.latencyMax),
                                    latencyAvg: strToMs(e.latencyAvg),
                                    latencyStdev: strToMs(e.latencyStdev),
                                    startOffset: e.startTime - x[0].startTime,
                                    endOffset: e.endTime - x[0].startTime,
                                }))
                            })
                        })
                    }
                }
            )
            rtrn[framework] = entry;
            return rtrn
        }, {}) : reducer(
            data,
            [
                { id: 'throughput', name: (v, i, a, x) => `${v.test}_${v.framework}_throughput` },
                { id: 'latencyMax', name: (v, i, a, x) => `${v.test}_${v.framework}_latencyMax` },
                { id: 'latencyAvg', name: (v, i, a, x) => `${v.test}_${v.framework}_latencyAvg` },
                { id: 'startTime', name: (v, i, a, x) => `${v.test}_${v.framework}_startTime` },
                { id: 'latencyStdev', name: (v, i, a, x) => `${v.test}_${v.framework}_latencyStdev` },
                { id: 'endTime', name: (v, i, a, x) => `${v.test}_${v.framework}_endTime` },
                { id: 'totalRequests', name: (v, i, a, x) => `${v.test}_${v.framework}_totalRequests` },
                { id: 'endOffset', name: (v, i, a, x) => `${v.test}_${v.framework}_endOffset` },
                { id: 'startOffset', name: (v, i, a, x) => `${v.test}_${v.framework}_startOffset` },
                { id: 'concurrency' }
            ],
            {
                getName: v => v.name,
                //            getDomain: [v=>v.startOffset,v=>v.endOffset],
                getDomain: 'concurrency',
                getSeries: (d, i, a) => {
                    return getTests(d.data).flatMap((test, testIndex) => {
                        return Object.entries(jsonpath.value(d, `$.data.rawData.${test}`)).flatMap(([framework, seriesData]) => {
                            return seriesData.map((e, seriesIndex, x) => {

                                const rtrn = {
                                    test,
                                    ...e,
                                    throughput: (e.totalRequests) / (e.endTime - e.startTime),
                                    concurrency: jsonpath.value(d, `$.data.concurrencyLevels[${seriesIndex}]`),
                                    framework,
                                    latencyMax: strToMs(e.latencyMax),
                                    latencyAvg: strToMs(e.latencyAvg),
                                    latencyStdev: strToMs(e.latencyStdev),
                                    startOffset: e.startTime - x[0].startTime,
                                    endOffset: e.endTime - x[0].startTime,
                                }
                                return rtrn;
                            })
                        })
                    })
                }
            }
        )
        return rtrn
    }, [data])

    const tableData = useMemo(() => {

        const selectors = [
            { name: 'completed', accessor: `$.completed` },
            {
                name: "topTps", accessor: "$.topTps"
            },
            ...allTests.map((test) => {
                return {
                    id: `scores_${test}`,
                    name: (v, i, a, x) => `${v.framework}_${test}`,
                    accessor: (v, i, a) => {
                        return (v[test] || {}).tps
                    }
                }
            }),
            ...allTests.map((test) => {
                return {
                    id: `max_${test}`,
                    name: `max_${test}`,
                    accessor: (v, i, a) => {
                        return (v[test] || {}).max
                    }
                }
            })
        ]
        const rtrn = reducer(
            data,
            selectors,
            {
                getDomain: (v) => v.framework,
                getName: getDataName,
                getSeries: (d, i, a) => {
                    const frameworks = jsonpath.query(d, `$.data.frameworks[*]`).flatMap((frameworkName, frameworkIndex) => {
                        const completed = parseInt(jsonpath.value(d, `$.data.completed['${frameworkName}']`) || "")
                        const testScores = getTests(d.data).map((testName, testIndex) => {
                            const maxScore = jsonpath.query(d, `$.data.rawData['${testName}'][*][*]`)
                                .map((stat, index) => Math.round(stat.totalRequests / (stat.endTime - stat.startTime)))
                                .reduce((a, b) => a > b ? a : b, Number.MIN_SAFE_INTEGER);
                            const best = jsonpath.query(d, `$.data.rawData['${testName}']['${frameworkName}'][*]`)
                                .map((stat, index) => ({
                                    index,
                                    concurrency: jsonpath.value(d, `$.data.concurrencyLevels[${index}]`),
                                    tps: Math.round(stat.totalRequests / (stat.endTime - stat.startTime))
                                }))
                                .reduce(
                                    (max, entry) => !max || entry.tps > max.tps ? entry : max,
                                    false
                                )
                            return {
                                test: testName,
                                max: maxScore,
                                ...best
                            }
                        }).reduce((rtrn, score) => {
                            const { test, ...rest } = score
                            rtrn[test] = rest;
                            return rtrn;
                        }, {})
                        return {
                            framework: frameworkName,
                            completed,
                            ...testScores
                        }
                    })
                    return frameworks;
                }
            })
        return rtrn;
    }, [data, allTests, allFrameworks]);


    useEffect(
        fetchSearch("techempower", location.search, setData)
        , [location.search, setData])

    const testNames = useMemo(() => [...new Set(data.flatMap(v => getTests(v.data)))], [data])

    const content = useMemo(() => {
        const rtrn = (data.length === 0 ? (<div>Loading</div>) : data.length > CUTOFF ?
            testNames.flatMap((testName, testIndex) => (
                Object.entries(frameworkSeries).map(([frameworkName, seriesData], index) => {
                    return (
                        <Card key={testIndex} style={{ padding: '10px' }}>
                            <ChartContainer
                                title={<Title headingLevel="h2" size="2xl">{`${testName} ${frameworkName}`}</Title>}
                                leftLabel="tps"
                                domainLabel="concurrency"
                                labels={
                                    data.reduce((rtrn, datum, datumIndex) => {
                                        rtrn[datum.name] = chartColors[datumIndex & chartColors.length]
                                        return rtrn;
                                    }, {})
                                }
                            >
                                <ResponsiveContainer width="100%" height={360}>
                                    <ComposedChart
                                        data={frameworkSeries[frameworkName]}
                                        style={{ userSelect: 'none' }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <Tooltip
                                            formatter={(e) => Number(e).toFixed(0)}
                                        //labelFormatter={(v) => Duration(v).toFormat("mm:ss")}
                                        />
                                        {/* <Legend align="left" payload={data.map((datum, datumIndex) => ({
                                            color: colors[colorNames[datumIndex % colorNames.length]][0],
                                            fill: colors[colorNames[datumIndex % colorNames.length]][0],
                                            type: 'rect',
                                            value: datum.name

                                        }))} */}
                                        />
                                        <XAxis
                                            allowDataOverflow={true}
                                            type="category"
                                            //scale="time"
                                            dataKey="__domainValue"
                                            domain={['auto', 'auto']}
                                            labelFormatter={(v) => Duration(v).toFormat("mm:ss")}
                                        >
                                            {/* <Label
                                                value="concurrency"
                                                position="insideBottom"
                                                angle={0}
                                                offset={0}
                                                textAnchor='middle'
                                                style={{ textAnchor: 'middle' }}
                                            /> */}
                                        </XAxis>
                                        <YAxis
                                            // width={40}
                                            yAxisId={0}
                                            orientation="left"
                                            allowDataOverflow={true}
                                            domain={['auto', 'auto']}
                                            tickFormatter={(v) => (v / 1000) + 'k'}
                                        >
                                            {/* <Label
                                                value="tps"
                                                position="insideLeft"
                                                angle={-90}
                                                offset={0}
                                                textAnchor='middle'
                                                style={{ textAnchor: 'middle' }}

                                            //position="insideTopLeft" 
                                            //offset={10}    
                                            /> */}
                                        </YAxis>
                                        {
                                            data.flatMap((datum, datumIndex) => {
                                                const pallet = colors[colorNames[datumIndex % colorNames.length]]
                                                return ["throughput"].map((statName, statIndex) => {
                                                    const key = `${datum.name}-${testName}_${frameworkName}_${statName}`
                                                    return (<Bar
                                                        key={key}
                                                        dataKey={key}
                                                        name={frameworkName}
                                                        yAxisId={0}
                                                        unit=""
                                                        stroke={pallet[statIndex % pallet.length]}
                                                        fill={pallet[statIndex % pallet.length]}
                                                        connectNulls
                                                        type="monotone"
                                                        isAnimationActive={false}
                                                    />)
                                                })
                                            })
                                        }
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </ChartContainer>
                        </Card>
                    )
                }

                )))
            :
            testNames.map((testName, testIndex) => (
                <Card key={testIndex} style={{ padding: '10px' }}>
                    <ChartContainer
                        title={<Title headingLevel="h2" size="2xl">{`${testName}`}</Title>}
                        leftLabel="tps"
                        domainLabel="concurrency"
                        labels={allFrameworks.reduce((rtrn, framework, frameworkIndex) => {
                            rtrn[framework] = chartColors[frameworkIndex % chartColors.length];
                            return rtrn;
                        }, {})}
                    >
                        <ResponsiveContainer width="100%" height={360}>
                            <ComposedChart
                                data={frameworkSeries}
                                style={{ userSelect: 'none' }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <Tooltip
                                    formatter={(e) => Number(e).toFixed(0)}
                                //labelFormatter={(v) => Duration(v).toFormat("mm:ss")}
                                />
                                {/* <Legend align="left" payload={allFrameworks.map((framework, frameworkIndex) => ({
                                    color: colors[colorNames[frameworkIndex % colorNames.length]][0],
                                    fill: colors[colorNames[frameworkIndex % colorNames.length]][0],
                                    type: 'rect',
                                    value: framework
                                }))}
                                /> */}
                                <XAxis
                                    allowDataOverflow={true}
                                    type="category"
                                    //scale="time"
                                    dataKey="__domainValue"
                                    domain={['auto', 'auto']}
                                    labelFormatter={(v) => Duration(v).toFormat("mm:ss")}
                                >
                                    {/* <Label
                                        value="concurrency"
                                        position="insideBottom"
                                        angle={0}
                                        offset={0}
                                        textAnchor='middle'
                                        style={{ textAnchor: 'middle' }}
                                    /> */}
                                </XAxis>
                                <YAxis
                                    // width={80}
                                    yAxisId={0}
                                    orientation="left"
                                    allowDataOverflow={true}
                                    domain={['auto', 'auto']}
                                    tickFormatter={(v) => (v / 1000) + 'k'}
                                >
                                    {/* <Label
                                        value="tps"
                                        position="insideLeft"
                                        angle={-90}
                                        offset={0}
                                        textAnchor='middle'
                                        style={{ textAnchor: 'middle' }}
                                    /> */}
                                </YAxis>
                                {allFrameworks.flatMap((frameworkName, frameworkIndex) => {
                                    const pallet = colors[colorNames[frameworkIndex % colorNames.length]]
                                    return ["throughput"].map((statName, statIndex) => {
                                        const key = `${data[0].name}-${testName}_${frameworkName}_${statName}`
                                        return (<Bar
                                            key={key}
                                            dataKey={key}
                                            name={frameworkName}
                                            yAxisId={0}
                                            unit=""
                                            stroke={pallet[statIndex % pallet.length]}
                                            fill={pallet[statIndex % pallet.length]}
                                            connectNulls
                                            type="monotone"
                                            isAnimationActive={false}
                                        />)
                                    })

                                })

                                }

                            </ComposedChart>
                        </ResponsiveContainer>
                    </ChartContainer>


                </Card>
            ))
        )
        return rtrn;
    }, [data, frameworkSeries, testNames, allFrameworks]);

    const Header = (
        <PageHeader
            toolbar={
                <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                </Toolbar>
            }
            logo="Techempower"
            avatar=""
            topNav=""
            showNavToggle={true}
            isNavOpen={showNav}
            onNavToggle={() => { setShowNav(!showNav) }}
        ></PageHeader>
    )
    const Navigation = (
        <Nav theme="dark">
            <NavGroup title="Tests">
                {testNames.map((v, i) => (<NavItem key={i}>{v}</NavItem>))}
            </NavGroup>
        </Nav>
    )

    const Sidebar = (
        <PageSidebar nav={Navigation} isNavOpen={showNav} theme="dark" />
    )

    const sortBy = (key) => (a, b) => {
        if (a[key] > b[key]) {
            return 1
        } else if (a[key < b[key]]) {
            return -1;
        } else {
            return 0;
        }
    }

    const multiRunTable = (
        <table className="pf-c-table pf-m-compact pf-m-grid-md">
            <thead>
                <tr>
                    <th>Framework</th>
                    {data.map((datum, datumIndex) => (<th key={datumIndex}>{datum.name}</th>))}
                </tr>
            </thead>
            {
                allTests.map((testName, testIndex) => (
                    <tbody data-label={testName} key={testIndex}>
                        {tableData.map((frameworkData, frameworkIndex) => (
                            <tr key={frameworkIndex}>
                                <th>{frameworkData.__domainValue}</th>
                                {data.map((datum, datumIndex) => (<td key={datumIndex}>{frameworkData[`${datum.name}-${frameworkData.__domainValue}_${testName}`] || NaN}</td>))}
                            </tr>
                        ))}
                    </tbody>
                ))
            }
        </table>
    )

    const singleRunTable = data.length == 1 ? (
        <Table
            useSelect={false}
            useSubComponent={false}
            columns={[
                {
                    Header: "Framework",
                    accessor: "__domainValue"
                },
                ...allTests.map((test) => {
                    const name = data[0].name;
                    return {
                        Header: test,
                        accessor: (v) => {
                            return v[`${name}-${v.__domainValue}_${test}`] || "--"
                        },
                        Cell: (args) => {
                            const { cell: { value }, row: { original, id } } = args;
                            const intId = parseInt(id)
                            // return (
                            //     <ComposedChart
                            //         layout="vertical"
                            //         height={16}
                            //         width={100}
                            //         data={[original]}
                            //     >
                            //         <YAxis
                            //             allowDataOverflow={true}
                            //             type="category"
                            //             dataKey="__domainValue"

                            //             hide={true}
                            //         />
                            //         <Tooltip
                            //             formatter={(e) => Number(e).toFixed(0)}
                            //         />
                            //         <XAxis
                            //             type="number"
                            //             domain={[0, original[`${name}-max_${test}`]]}
                            //             hide={true}
                            //         />
                            //         <Bar
                            //             isAnimationActive={false}
                            //             name={test}
                            //             dataKey={`${name}-${original.__domainValue}_${test}`}
                            //             fill={colors[colorNames[intId % colorNames.length]][0]}

                            //         />
                            //     </ComposedChart>
                            // )
                            return value;
                        }
                    }
                })
            ]}
            data={tableData}
        ></Table>
    ) : null

    return (
        <Page header={Header} sidebar={Sidebar}>
            <Helmet><title>Techempower</title></Helmet>
            <PageSection variant={PageSectionVariants.light}>
                {data.length == 1 ? singleRunTable : data.length > 1 ? multiRunTable : "Loading"}
            </PageSection>
            {/* <PageSection variant={PageSectionVariants.light}>
                {multiRunTable}
            </PageSection> */}
            <PageSection isFilled={true}>
                <Stack gutter="md">
                    {Array.isArray(content) ? (content.map((v, i) => (<StackItem key={i}>{v}</StackItem>))) : (<StackItem>{content}</StackItem>)}
                </Stack>
            </PageSection>
        </Page>
    )
}

export default TechEmpower;