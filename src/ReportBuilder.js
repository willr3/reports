import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Helmet } from "react-helmet";
import {
    Button, ButtonVariant,
    Card, CardActions, CardHeader, CardBody, CardFooter, CardTitle,
    CodeBlock, CodeBlockAction, CodeBlockCode, ClipboardCopyButton,
    Drawer, DrawerPanelContent, DrawerContent, DrawerContentBody, DrawerPanelBody, DrawerHead, DrawerActions, DrawerCloseButton,
    Dropdown, DropdownToggle, DropdownItem, DropdownSeparator, DropdownPosition, DropdownDirection,
    Expandable,
    Form, FormGroup, Checkbox, Popover, ActionGroup, FormSelect, FormSelectOption,
    FormFieldGroup, FormFieldGroupExpandable, FormFieldGroupHeader, FormSection,
    Grid, GridItem,
    InputGroup, InputGroupText, TextInput,
    Label,
    Nav, NavGroup, NavList, NavItem,
    Page, PageHeader, PageSection, PageSidebar, PageSectionVariants,
    Select, SelectOption, SelectVariant, SelectGroup,
    SimpleList, SimpleListItem, SimpleListGroup,
    Split, SplitItem,
    Stack, StackItem,
    TextContent,
    Title,
    Toolbar, ToolbarContent, ToolbarGroup,  ToolbarItem //ToolbarSection
} from '@patternfly/react-core';
import {
    PlusIcon,
    CogIcon,
    CloseIcon,
    CaretDownIcon,
    CaretRightIcon,
    PlayIcon,
    TrashIcon,

} from '@patternfly/react-icons';
import jsonpath from 'jsonpath';
import { Duration } from 'luxon'

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter'
import {dark} from 'react-syntax-highlighter/dist/esm/styles/prism'


import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
import '@patternfly/patternfly/patternfly-addons.css'; //have to use this import to customize scss-variables.scss
import './ReportBuilder.css';
import Editor from './components/Editor';
import {PrometheusChart} from './domain/prometheus';
import {Table} from './domain/charts';



const types = {"markdown":"", "javascript":"", "prometheus":{}, "table":{}, "hyperfoil":{},"pdf":{},"cdf":{},"histogram":{},"timeseries":{}}

// nbformat.readthedocs.io/en/latest/format_description.html#top-level-structure
const notebook = {
    "metadata": {
        "kernel_info": {
            "name": "the name of the kernel"
        },
        "language_info": {
            "name": "javascript",
            "version": "version of the language",
            "codemirror_mode": "The name of the codemirror mode to use [optional]"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 0,
    "cells": [
        {
            "cell_type": "table",
            "source": {
                "header": "table header",
                "selectors":[
                    {name: "totalCount"},
                    {name: "min"},
                    {name: "max"},
                    {name: 50}
                ],
                precision:3,
                layout:"column",
                header:"",
                getName:(v)=>v.name
            }
        },
        {
            "cell_type": "prometheus",
            "metadata": {},
            "source": {
                "title" : "Prometheus Chart",
                "search": "",
                "target": "pod",
                "metric": "cpu",
                "leftLabel":"left axis label",
                "rightLabel":"",
                "domainLabel":"elapsed time",
            }
        },
        {
            "cell_type": "javascript",
            "metadata": {},
            "source": "(a,b,)=>{\n  return jsonpath.query(a,\"$.foo.bar\")\n}"
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source":
                `# h1 header
## h2 header
### h3 header
#### h4 header
##### h5 header
###### h6 header

\`\`\`javacscript
console.log("string",variable)
\`\`\`

Now some inline markup like _italics_,  **bold**, 
and \`code()\`. Note that underscores 
in_words_are ignored.

|foo|bar|
|---|---:
|biz|buz|

Code

    firstLine
    secondLIne

Unordered

+ Create a list by starting a line with \`+\`, \`-\`, or \`*\`
+ Sub-lists are made by indenting 2 spaces:
  - Marker character change forces new list start:
    * Ac tristique libero volutpat at
    + Facilisis in pretium nisl aliquet
    - Nulla volutpat aliquam velit
+ Very easy!

Ordered

1. Lorem ipsum dolor sit amet
2. Consectetur adipiscing elit
3. Integer molestie lorem at massa

// Some comments
    line 1 of code
    line 2 of code
    line 3 of code

\`\`\`\`application/json
{ value: ["or with a mime type"] }
\`\`\`\`

> Blockquotes are like quoted text in email replies
>> And, they can be nested`
        }
    ]
}

const BaseCell = ({ name = "base", index = 0, children, onDelete = (index) => { } }) => {
    return (
        <Card isCompact>
            <CardHeader className=" pf-u-py-sm" style={{}}>
                <CardTitle>{name}</CardTitle>
                <CardActions>
                    <Button variant={ButtonVariant.plain} isSmall onClick={() => onDelete(index)} ><TrashIcon/></Button>
                </CardActions>
            </CardHeader>
            
            <CardBody style={{ display: 'block' }}>
                {children}
            </CardBody>
            <CardFooter style={{ display: 'none' }}>
                <div className="cellOutput">
                    <TextContent>
                    </TextContent>
                </div>
            </CardFooter>
        </Card>
    )
}
const JavascriptCell = ({ index = 0, source = "", onSave = () => { }, onDelete = (index) => { } }) => {

    return (
        <BaseCell name="javascript" index={index} onDelete={onDelete}>
            <div className="monacoContainer" style={{ border: '1px solid #d2d2d2', borderLeftWidth: '5px', padding: '10px', backgroundColor: '#fafafa' }}>
                <Editor
                    value={source}
                    onChange={onSave}
                    //setValueGetter={e => { editor.current = e }} //only worked when there was a single editor
                    //setEditor={setMonaco} //why was this a thing?
                    //options={{ mode: "application/ld+json" }}

                    language="javascript"
                />
            </div>
        </BaseCell>
    )
}
const TableCell = ({ index = 0, onDelete = ()=>{}, onSave=()=>{}, source= {}})=>{
    const {
        data=[], 
        selectors=[],
        precision=3,
        layout="column",
        header="",
        getName=(v)=>v.name
    } = source;
    console.log("selectors",selectors)
    return (
        <BaseCell name="table" index={index} onDelete={onDelete}>
            <Form isHorizontal={true}>
                <FormGroup label="header" labelInfo="the header info" isRequired={false} fieldId={`${index}-header`} helperText="header to display above the table">
                    <TextInput isRequired={false} type="text" id={`${index}-header`} name={`${index}-header`} value={header} onChange={v=>onSave({...source, header: v})}></TextInput>
                </FormGroup>                
                <FormGroup label="layout" isRequired={true} fieldId={`${index}-layout`} helperText="direction for data fields">
                    <FormSelect value={layout} id={`${index}-layout`} name={`${index}-layout`} aria-label="layout" onChange={v=>onSave({...source, layout: v})}>
                        <FormSelectOption isDisabled={false} key={0} value="column" label="column"/>
                        <FormSelectOption isDisabled={false} key={1} value="row" label="row"/>
                    </FormSelect>
                </FormGroup>
                <FormGroup label="precision" labelInfo="" isRequired={false} fieldId={`${index}-precision`} helperText="precision helper text">
                    <TextInput isRequired={false} type="text" id={`${index}-precision`} name={`${index}-precision`} value={header} onChange={v=>onSave({...source, header: v})}></TextInput>
                </FormGroup>                
                <FormSection title="selectors">
                    {/* <FormFieldGroup
                    header={
                        <FormFieldGroupHeader
                            titleText={{
                                text: 'selectors',
                                id: `${index}-selectors`
                            }}
                        />
                    }> */}
                    {selectors.map((selector,selectorIndex)=>{
                        return (
                            <div  key={selectorIndex}>
                                {/* <FormGroup label="name" fieldId={`${index}-${selectorIndex}-name`} helperText="" hasNoPaddingTop>
                                    <TextInput type="text" id={`${index}-${selectorIndex}-name`} name={`${index}-${selectorIndex}-name`} value={selector.name} onChange={v=>{selector.name=v; onSave({...source}) }}></TextInput>
                                </FormGroup> */}
                                <InputGroup>
                                    <InputGroupText id="name" aria-label="name">
                                        Name
                                    </InputGroupText>
                                    <TextInput type="text" id={`${index}-${selectorIndex}-name`} name={`${index}-${selectorIndex}-name`} value={selector.name} onChange={v=>{selector.name=v; onSave({...source}) }}></TextInput>
                                </InputGroup>
                                <FormGroup label="header" fieldId={`${index}-${selectorIndex}-header`} helperText="" hasNoPaddingTop>
                                    <TextInput type="text" id={`${index}-${selectorIndex}-header`} name={`${index}-${selectorIndex}-header`} value={selector.header} onChange={v=>{selector.header=v; onSave({...source}) }}></TextInput>
                                </FormGroup> 
                                <FormGroup label="accessor" fieldId={`${index}-${selectorIndex}-accessor`} helperText="" hasNoPaddingTop>
                                    <div className="monacoContainer" style={{ border: '1px solid #d2d2d2', borderLeftWidth: '5px', padding: '10px', backgroundColor: '#fafafa' }}>
                                        <Editor
                                            //height={setHeight}
                                            value={selector.accessor||""}
                                            onChange={(v)=>{selector.accessor = v; onSave({...source}) }}
                                            //setValueGetter={e => { editor.current = e }}
                                            //setEditor={setMonaco}
                                            //options={{ mode: "application/ld+json" }}
                                            language="javascript"
                                        />
                                    </div>
                                </FormGroup>                                
                            </div>
                        )
                    })}
                    <Button variant="tertiary" onClick={(e)=>{selectors.push({name:"",header:"",accessor:""}); onSave({...source})}}>Add Selector</Button>
                    
                {/* </FormFieldGroup> */}

                </FormSection>
            </Form>
        </BaseCell>
    )
}
const PrometheusCell = ({ index = 0, onDelete = ()=>{}, onSave=()=>{}, source = {}})=>{
    const {//coppie from prometheus.js
        data=[], 
        search=" ",
        target = "pod", 
        metric = "cpu", 
        title= " ",
        leftLabel='left', 
        rightLabel="right",
        domainLabel="elapsed time",
            domain=['auto','auto'], 
        setDomain=false,
        formatter=(v)=>v,
        tickFormatter=(v)=>v, 
        labelFormatter=(v) => Duration(v).toFormat("hh:mm"),
        getName = (datum, datumIndex, datasets) => datum.name,
        ...rest
    } = source
    console.log("source",source)
    return (
        <BaseCell name="prometheus" index={index} onDelete={onDelete}>
            <Form isHorizontal={true} >
                <FormGroup label="title" isRequired={false} fieldId={`${index}-title`} helperText="title to display above the chart">
                    <TextInput isRequired={false} type="text" id={`${index}-title`} name={`${index}-title`} value={title} onChange={v=>onSave({...source, title: v})}></TextInput>
                </FormGroup>
                <FormGroup label="metric" isRequired={true} fieldId={`${index}-metric`} helperText="prometheus metric to display">
                    <FormSelect value={metric} id={`${index}-metric`} name={`${index}-metric`} aria-label="metric" onChange={v=>onSave({...source, metric: v})}>
                        <FormSelectOption isDisabled={false} key={0} value="mem" label="memory"/>
                        <FormSelectOption isDisabled={false} key={1} value="cpu" label="cpu"/>
                    </FormSelect>
                </FormGroup>
                <FormGroup label="target" isRequired={true} fieldId={`${index}-target`} helperText="prometheus target for metrics">
                    <FormSelect value={target} id={`${index}-target`} name={`${index}-target`} aria-label="target" onChange={v=>onSave({...source, target: v})}>
                        <FormSelectOption isDisabled={false} key={0} value="namespace" label="namespace"/>
                        <FormSelectOption isDisabled={false} key={1} value="pod" label="pod"/>
                    </FormSelect>
                </FormGroup>
                <FormGroup label="search" isRequired={true} fieldId={`${index}-search`} helperText="pattern to find in target">
                    <TextInput isRequired={true} type="text" id={`${index}-search`} name={`${index}-search`} value={search} onChange={v=>onSave({...source, search: v})}></TextInput>
                </FormGroup>

            </Form>
        </BaseCell>
    )
}
const MarkdownCell = ({ index = 0, source = "", onSave = () => { }, onDelete = (index) => { } }) => {

    return (
        <BaseCell name="markdown" index={index} onDelete={onDelete}>
            <div className="monacoContainer" style={{ border: '1px solid #d2d2d2', borderLeftWidth: '5px', padding: '10px', backgroundColor: '#fafafa' }}>
                <Editor
                    //height={setHeight}
                    value={source}
                    onChange={onSave}
                    //setValueGetter={e => { editor.current = e }}
                    //setEditor={setMonaco}
                    //options={{ mode: "application/ld+json" }}

                    language="markdown"
                />
            </div>
        </BaseCell>
    )
}
const SwitchCell = ({ type = "javascript", ...args }) => {
    switch (type) {
        case "javascript": {
            return <JavascriptCell {...args} />
        } break;
        case "markdown": {
            return <MarkdownCell {...args} />
        } break;
        case "prometheus": {
            return <PrometheusCell {...args} />
        } break;
        case "table" : {
            return <TableCell {...args} />
        } break;
        default: {
            return <div>{type}</div>
        } break;
    }
}

const AddCell = ({ index = 0, onAdd = (index, type) => { } }) => {
    const [open, setOpen] = useState(false);
    return (<div className="addCell2" style={{ display: 'flex', justifyContent: 'center' }}>
        <Dropdown
            isPlain={true}
            onSelect={(a, b, c) => { setOpen(false); }}
            isOpen={open}
            toggle={<DropdownToggle id="toggle-add" onToggle={setOpen} >add</DropdownToggle>}
            dropdownItems={Object.keys(types).map((type) => (<DropdownItem key={type} component="button" onClick={() => { onAdd(index, type); }}>{type}</DropdownItem>))}
        /></div>)
}

const RenderTable = ({data=[], source={}}) => {
    const {
        selectors=[],
        precision=3,
        layout="column",
        header="",
        getName=(v)=>v.name
    } = source
    return (
        <div>
            <div>Table</div>
            <Table
                data={data}
                header={header}
                selectors={selectors}
                precision={precision}
                layout={layout}
            />
        </div>
    )
}
const RenderPrometheus = ({data = [] , source = {}}) => {
    const {
        metric = "cpu", 
        search="",
        title=`${metric} ${search}`,        
        target = "pod", 
        leftLabel=`${metric}`, 
        rightLabel="",
        domainLabel="elapsed time",    
        ...rest
    } = source
    return (
        <div>
            <div>prometheus</div>
        <PrometheusChart
            data={data}
            tickFormatter={(v)=>metric==="mem" ? Number(v/(1024*1024*1024)).toFixed(1)+"G" : v}
            formatter={(v)=>metric==="mem" ? Number(v/(1024*1024*1024)).toFixed(2)+"G" : v}
            title={title}
            search={search}
            target={target}
            stat={metric}
            leftLabel={leftLabel}
            domainLabel={domainLabel}
        />
        </div>
    )
}
const RenderMarkdown = ({ source = "" }) => {
    return (
        <TextContent>
            <ReactMarkdown children={source} remarkPlugins={[remarkGfm]} 
                components={{
                    //'heading': ({node,...props})=><h1 className={"pf-c-title " + (["pf-m-4xl", "pf-m-3xl", "pf-m-2xl", "pf-m-xl", "pf-m-lg", "pf-m-md"][props.level - 1])} {...props}/>,
                    code({node, inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                        //   <SyntaxHighlighter
                        //     children={String(children).replace(/\n$/, '')}
                        //     style={dark}
                        //     language={match[1]}
                        //     PreTag="div"
                        //     {...props}
                        //   />
                        <CodeBlock>
                            <CodeBlockCode >
                                {String(children).replace(/\n$/,'')}
                            </CodeBlockCode>
                        </CodeBlock>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                    },
                    h1(props){return (<h1 className="pf-c-title pf-m-4xl" {...props}/>)},
                    h2(props){return (<h2 className="pf-c-title pf-m-3xl" {...props}/>)},
                    h3(props){return (<h3 className="pf-c-title pf-m-2xl" {...props}/>)},
                    h4(props){return (<h4 className="pf-c-title pf-m-xl" {...props}/>)},
                    h5(props){return (<h5 className="pf-c-title pf-m-lg" {...props}/>)},
                    h6(props){return (<h6 className="pf-c-title pf-m-md" {...props}/>)},
                    ol({ordered,...props}){return (<ol className="pf-c-list" {...props}/>)},
                    ul({ordered,...props}){return (<ul className="pf-c-list" {...props}/>)},
                    //input({checked,disabled,type,...props})
                    //li(props){return (<li className="" {...props}/>)}
                    table(props){
                        return (<table className="pf-c-table pf-m-compact pf-m-grid-md" {...props}/>)
                    }
                }}
                renderers={{
                    "heading": (item) => {
                        return React.createElement("h1", {
                            //    ...item,
                            className: "pf-c-title " + (["pf-m-4xl", "pf-m-3xl", "pf-m-2xl", "pf-m-xl", "pf-m-lg", "pf-m-md"][item.level - 1])
                        }, item.children)
                    },
                    "list": (item) => {
                        return React.createElement(item.ordered ? 'ol' : 'ul', {
                            //    ...item,
                            className: "pf-c-list"
                        }, item.children)
                    },
                    "table": (item) => {
                        const { columnAlignment, ...props } = item;
                        const toRender = {
                            ...props,
                            className: "pf-c-table pf-m-compact pf-m-grid-md"
                        }
                        return React.createElement("table", toRender, toRender.children || [])
                        //item.className="pf-c-table pf-m-compact pf-m-grid-md"
                        return ReactMarkdown.renderers.table(toRender)
                    }
                }}

            />
        </TextContent>
    )
}

export default ({ }) => {
    const [isExpanded, setExpanded] = useState(false);

    const [sources, setSources] = useState([])

    const [value, setValue] = useState(notebook)


    const addCell = (index = 0, type = "javascript") => {
        value.cells.splice(index, 0, {
            cell_type: type,
            metadata: {},
            source: types[type]
        })
    }
    const deleteCell = ({ index = 0 }) => {
        value.cells.splice(index, 1);
    }

    const panelContent = (
        <DrawerPanelContent width={25}>
            <DrawerHead>
                Data
                <DrawerActions>
                    <DrawerCloseButton onClick={() => setExpanded(false)} />
                </DrawerActions>
            </DrawerHead>
            <Toolbar id="selection">
                {/* <ToolbarSection aria-label="wtf is this required"> */}
                    <ToolbarItem style={{ width: '100%' }}>
                        <InputGroup>
                            <TextInput name="selectionInput" id="selectionInput" type="search" aria-label="add data" />
                            <Button variant={ButtonVariant.control} aria-label="add button"
                                onClick={e => {
                                    const v = document.getElementById("selectionInput").value
                                    setSources([...sources, v])
                                }}
                            >
                                <PlusIcon />
                            </Button>
                        </InputGroup>
                    </ToolbarItem>
                {/* </ToolbarSection> */}
            </Toolbar>
            <div className="pf-c-simple-list">
                <h2 className="pf-c-simple-list__title">
                    Loaded Data
                                </h2>
                {sources.map((source, index) =>
                    (<div key={index} className="pf-c-simple-list__item-link" style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center' }}>
                        <span style={{ flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{source}</span>
                        <Button style={{ alignSelf: 'center' }} variant={ButtonVariant.plain} onClick={
                            () => {
                                const sliced = sources.splice(index, 1);
                                setSources([...sources])
                            }
                        }><CloseIcon /></Button>
                    </div>)
                )}
            </div>
        </DrawerPanelContent>
    )
    console.log("render ReportBuilder",Date.now())
    return (
        <Drawer
            isExpanded={isExpanded}
            isInline={false}
        >
            <DrawerContent panelContent={panelContent} style={{ overflowY: 'hidden' }}>
                <DrawerContentBody>
                    <Stack>
                        <StackItem>
                            <Toolbar className="">{/*pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md */}
                                <ToolbarContent>
                                <ToolbarGroup>
                                    <ToolbarItem>
                                        Report Builder
                                        <Helmet>
                                            <title>Report Builder</title>
                                        </Helmet>
                                    </ToolbarItem>
                                </ToolbarGroup>
                                <ToolbarGroup className="pf-m-align-right pf-m-no-fill">
                                    <ToolbarItem onClick={() => setExpanded(!isExpanded)}><CogIcon /></ToolbarItem>
                                </ToolbarGroup>
                                </ToolbarContent>
                            </Toolbar>
                        </StackItem>
                        <StackItem isFilled={true}>
                            <Split style={{ height: "100%" }}>
                                <SplitItem isFilled={true} style={{ overflow: 'hidden' }}>
                                    <Grid style={{ height: '100%' }}>
                                        <GridItem span={6}>
                                            <Stack>
                                                <StackItem isFilled={true} style={{ padding: '10px', backgroundColor: "#f0f0f0", overflowY: 'scroll', height: 0 }}>
                                                    {value.cells.flatMap((cell, index) => {
                                                        return [
                                                            (<AddCell
                                                                key={"add-" + index}
                                                                index={index}
                                                                onAdd={(index, type) => {
                                                                    addCell(index, type);
                                                                    setValue({ ...value })
                                                                }} />),
                                                            (<SwitchCell
                                                                key={"switch-" + index}
                                                                index={index}
                                                                type={cell.cell_type}
                                                                source={cell.source}
                                                                onSave={(v) => { value.cells[index].source = v; setValue({ ...value }) }}
                                                                onDelete={(index) => {
                                                                    value.cells.splice(index, 1)
                                                                    setValue({ ...value })
                                                                }}
                                                            />)]
                                                    })}
                                                    <AddCell
                                                        index={value.cells.length}
                                                        onAdd={(index, type) => {
                                                            addCell(index, type);
                                                            setValue({ ...value })
                                                        }}
                                                    />
                                                </StackItem>
                                            </Stack>
                                        </GridItem>
                                        <GridItem span={6}>
                                            <Stack>
                                                <StackItem isFilled={true} style={{ padding: '10px', backgroundColor: "#fff", overflowY: 'scroll', height: 0 }}>
                                                    {value.cells.flatMap((cell, index) => {
                                                        const { cell_type = "javascript", source = "" } = cell;
                                                        switch (cell_type) {
                                                            case "markdown": {

                                                                return (
                                                                    <RenderMarkdown key={index} source={source} />
                                                                )
                                                            }; break;
                                                            case "prometheus": {
                                                                return (
                                                                    <RenderPrometheus key={index} data={[]} source={source} />
                                                                )
                                                            }; break;
                                                            default:
                                                                return null;
                                                        }
                                                    })}
                                                </StackItem>
                                            </Stack>
                                        </GridItem>
                                    </Grid>

                                </SplitItem>
                            </Split>
                        </StackItem>
                        <StackItem>Footer</StackItem>
                    </Stack>
                </DrawerContentBody>
            </DrawerContent>
        </Drawer>

    )
}