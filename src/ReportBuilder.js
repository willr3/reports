import React, { useState, useRef, useMemo, useEffect } from 'react';

import {
    Button, ButtonVariant,
    Card, CardHeader, CardBody, CardFooter,
    Drawer, DrawerPanelContent, DrawerContent, DrawerContentBody, DrawerPanelBody, DrawerHead, DrawerActions, DrawerCloseButton,
    Dropdown, DropdownToggle, DropdownItem, DropdownSeparator, DropdownPosition, DropdownDirection,
    Expandable,
    Grid, GridItem,
    InputGroup, TextInput,
    Label,
    Nav, NavGroup, NavList, NavItem,
    Page, PageHeader, PageSection, PageSidebar, PageSectionVariants,
    Select, SelectOption, SelectVariant, SelectGroup,
    SimpleList, SimpleListItem, SimpleListGroup,
    Split, SplitItem,
    Stack, StackItem,
    TextContent,
    Title,
    Toolbar, ToolbarGroup, ToolbarSection, ToolbarItem
} from '@patternfly/react-core';
import {
    PlusIcon,
    CogIcon,
    CloseIcon,
    CaretDownIcon,
    CaretRightIcon,

} from '@patternfly/react-icons';

import ReactMarkdown from 'react-markdown';

import '@patternfly/patternfly/patternfly.css'; //have to use this import to customize scss-variables.scss
import '@patternfly/patternfly/patternfly-addons.css'; //have to use this import to customize scss-variables.scss
import './ReportBuilder.css';
import Editor from './components/Editor';



const types = ["markdown", "javascript"]

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
        <Card>
            <CardHeader className=" pf-u-py-sm" style={{}}>
                <Toolbar className="pf-u-display-flex pf-u-justify-content-space-between foo">
                    <ToolbarGroup>
                        <ToolbarItem><Title size="xl">{name}</Title></ToolbarItem>
                    </ToolbarGroup>
                    <ToolbarGroup className="">
                        <ToolbarItem>
                            <Button variant={ButtonVariant.danger} onClick={() => onDelete(index)}>delete</Button>
                        </ToolbarItem>
                    </ToolbarGroup>
                </Toolbar>
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
    }
}

const AddCell = ({ index = 0, onAdd = (index, type) => { } }) => {
    const [open, setOpen] = useState(false);
    return (<div className="addCell2" style={{ display: 'flex', justifyContent: 'center' }}>
        <Dropdown
            isPlain={true}
            onSelect={(a, b, c) => { setOpen(false); }}
            isOpen={open}
            toggle={<DropdownToggle id="toggle-add" onToggle={setOpen} iconComponent={null}>add</DropdownToggle>}
            dropdownItems={types.map((type) => (<DropdownItem key={type} component="button" onClick={() => { onAdd(index, type); }}>{type}</DropdownItem>))}
        /></div>)
}

const RenderMarkdown = ({ source = "" }) => {
    return (
        <TextContent>
            <ReactMarkdown source={source}
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
            source: ""
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
                <ToolbarSection aria-label="wtf is this required">
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
                </ToolbarSection>
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
    return (
        <Drawer
            isExpanded={isExpanded}
            isInline={false}
        >
            <DrawerContent panelContent={panelContent} style={{ overflowY: 'hidden' }}>
                <DrawerContentBody>
                    <Stack>
                        <StackItem>
                            <Toolbar className="pf-l-toolbar pf-u-justify-content-space-between pf-u-mx-xl pf-u-my-md">
                                <ToolbarGroup>
                                    <ToolbarItem>Report Builder</ToolbarItem>
                                </ToolbarGroup>
                                <ToolbarGroup className="pf-m-align-right pf-m-no-fill">
                                    <ToolbarItem onClick={() => setExpanded(!isExpanded)}><CogIcon /></ToolbarItem>
                                </ToolbarGroup>
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
                                                <StackItem isFilled={true} style={{ padding: '10px', backgroundColor: "#f0f0f0", overflowY: 'scroll', height: 0 }}>
                                                    {value.cells.flatMap((cell, index) => {
                                                        const { cell_type = "javascript", source = "" } = cell;
                                                        switch (cell_type) {
                                                            case "markdown": {

                                                                return (
                                                                    <RenderMarkdown key={index} source={source} />
                                                                )
                                                            };
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