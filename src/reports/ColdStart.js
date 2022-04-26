import React, { useState, useEffect, useMemo } from 'react';
import jsonpath from 'jsonpath';
import { useLocation } from "react-router"
import { Helmet } from "react-helmet";
//import { AutoSizer } from 'react-virtualized';
import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
import '../App.css';
import { getStats } from '../domain/stats';
import * as Charts from '../domain/charts';
import { fetchSearch } from '../redux/actions';

import {Table} from '../domain/charts';
import ChartContainer from '../components/ChartContainer';

const getDataName = (v) => v.name;
const curlToMs = (v, defaultValue = NaN) => {
    const x = /([0-9]+)m([0-9]+\.[0-9]{3})s/.exec(v)
    if (x) {
        return 1000 * (x[1] * 60 + x[2])
    } else {
        return defaultValue
    }
}
const getReal = (datum) => jsonpath.query(datum, '$.data.qdup.run.state.time[*]').map(v => curlToMs(v.real))

function ColdStart() {
    const location = useLocation();
    const [data, setData] = useState([])
    useEffect(
        fetchSearch("coldStart", location.search, setData)
        , [location.search, setData])

    const times = useMemo(() => {
        return data.map((datum) => {
            return {
                name: getDataName(datum),
                times: jsonpath.query(datum, '$.data.qdup.run.state.time[*]').map(v => curlToMs(v.real) / 1000)
            }
        })
    }, [data])
    return (
        <>
            <Helmet>
                <title>ColdStart {data.map(getDataName).join(" ")}</title>
            </Helmet>
            <div className="pf-c-content">
                <div className="pf-c-card">
                    <div className="pf-c-card__body" /*style={{ paddingBottom: '100px', borderBottom: 'none', display: 'flex', flexDirection: 'column', '&&after': { content: ' ', padding: '1em' } }}*/>
                        <h1>Serverless Scale from Zero Testing</h1>
                        <ChartContainer title={"Operators"}>
                            <Table
                                data={data}
                                header="Operator"
                                layout="columns"
                                selectors={
                                    [...new Set(data.flatMap((datum)=>{
                                        return jsonpath.query(datum,"$.data.oc.operators.items[*].spec.name")
                                    }))].map((operator,operatorIndex)=>{
                                        return {
                                            header: operator,
                                            accessor: (v,i,a)=>{
                                                return jsonpath.value(v,`$.data.oc.operators.items[?(@.spec.name === '${operator}')].status.currentCSV`)
                                            }
                                        }
                                    })
                                }
                                getName={getDataName}
                            />
                        </ChartContainer>
                        <ChartContainer title={<>curl statistics</>} >
                            <Table
                                data={data.map(getStats(getReal)).map((stat,index)=>{
                                    return {
                                        ...stat,
                                        name: getDataName(data[index],index,data)
                                    }
                                })}
                                header="stat"
                                selectors={[
                                    {name: "totalCount"},
                                    {name: "min"},
                                    {name: "max"},
                                    {name: "mean"},
                                    {name: 50},
                                    {name: 90},
                                    {name: 99},
                                    {name: 99.9},
                                    {name: 99.99},
                                    {name: 99.999}
                                ]}
                                getName={getDataName}
                            />
                        </ChartContainer>
                        <Charts.Histo
                            title="curl histogram"
                            data={data}
                            selector={(datum) => jsonpath.query(datum, '$.data.qdup.run.state.time[*]').map(v => {
                                return curlToMs(v.real) / 1000
                            })}
                            unit="seconds"
                            getName={getDataName}
                            decimals={1}

                        />
                        <Charts.CDF
                            title="curl cumulative distribution"
                            data={data}
                            selector={(datum) => jsonpath.query(datum, '$.data.qdup.run.state.time[*]').map(v => curlToMs(v.real) / 1000)}
                            unit="seconds"
                            getName={getDataName}
                            decimals={1}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}
export default ColdStart;