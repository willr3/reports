import React, {useState} from 'react';
import CaptureContainer from './CaptureContainer';

import './ChartContainer.css';
import {
    Button,
    //Spinner,
    Tooltip,
} from '@patternfly/react-core';
import {
    PencilAltIcon
} from '@patternfly/react-icons';

const LegendEntry = ({ name, color,...spread }) => (
    <div className="legend-entry" {...spread}>
        <div className="legend-icon" style={{ backgroundColor: color, borderColor: color }} />
        <div className="legend-text">{name}</div>
    </div>
)

export default ({
    title = undefined,
    leftLabel = undefined,
    rightLabel = undefined,
    domainLabel = undefined,
    labels = {},
    editor = undefined,
    onDoubleClick = (e)=>{},
    style = { backgroundColor: '#ffffff' },
    children
}) => {
    const fixedStyle = { }
    const [editing,setEditing] = useState(false);
    return (
        <CaptureContainer name={title || "chart"}>
            <div className="panel-container" style={fixedStyle}>

                <div className="panel-header" style={fixedStyle}>
                    <div style={{  }}>
                            <span style={{float:'left'}}>
                                {title}
                            </span>
                            {editor ? <span className="panel-edit">
                                    <Button variant="plain" aria-label="Action" onClick={(e)=>{setEditing(!editing)}}>
                                        <PencilAltIcon />
                                    </Button>
                            </span> : null }
                        {/* <CaretDownIcon/> */}
                    </div>
                </div>

                <div className="panel-content" style={fixedStyle}>
                    <div className="chart-container" style={fixedStyle} >
                        {leftLabel ? (
                            <div className="left-container" style={fixedStyle}>
                                <div className="left-label" style={fixedStyle}>
                                    {leftLabel}
                                </div>
                            </div>
                        ) : null}
                        <div className="chart-content" style={{ flexGrow: 1 }} onDoubleClick={onDoubleClick}>
                            {editing ? editor : children}
                        </div>
                        {rightLabel ? (
                            <div className="right-container" style={fixedStyle}>
                                <div className="right-label" style={{ fixedStyle }}>
                                    {rightLabel}
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
                <div className="panel-footer" style={fixedStyle}>
                    {domainLabel ? (<div style={{ textAlign: 'center' }}>{domainLabel}</div>) : null}
                    <div className="legend">
                        {Object.entries(labels).map(([name, color]) => (<LegendEntry name={name} key={name} color={color} />))}
                    </div>
                </div>
            </div>
        </CaptureContainer>
    )
}