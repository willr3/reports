import React, { useEffect, useMemo } from 'react';
import { Spinner, CardFooter } from '@patternfly/react-core';
import { useTable, useSortBy, useRowSelect, useExpanded } from 'react-table'
import clsx from 'clsx';
import {
  Card,
  CardHead,
  CardHeader,
  CardHeadMain,
  CardHeadActions,
  Toolbar,
  ToolbarGroup,
  ToolbarItem,
  CardBody,
  Nav,
  NavGroup,
  NavItem,
  NavList,
  Page,
  PageHeader,
  PageSection,
  PageSidebar,
  Title
} from '@patternfly/react-core';
import {
  CaretDownIcon,
  CaretRightIcon,
} from '@patternfly/react-icons';

import './Table.css';

// We need to pass the same empty list to prevent re-renders
const NO_DATA = []
//https://codesandbox.io/embed/github/tannerlinsley/react-table/tree/master/examples/row-selection
const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = React.useRef()
    const resolvedRef = ref || defaultRef

    React.useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate
    }, [resolvedRef, indeterminate])
    return (
      <>
        <input type="checkbox" ref={resolvedRef} {...rest} />
      </>
    )
  }
)

const FAILED_CONTENT = "--"

function Table({
  columns,
  data,
  initialSortBy = [],
  header = false,
  footer = false,
  useSubComponent = true,
  renderRowSubComponent = () => null,
  useSelect = true,
  selectedRows = {},
  setSelectedRows = () => { }

}) {

  const safeColumns = useMemo(()=>{
    return columns.map(column=>{
      ["accessor","Cell"].forEach(key=>{
        if(column.hasOwnProperty(key) && typeof column[key] === "function"){
          const existing = column[key]
          column[key] = (...args)=>{
            try{
              return existing(...args)
            }catch(e){
              return FAILED_CONTENT
            }
          }
        }
      })
      return column
    })
    
  },[columns])

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    visibleColumns,
    selectedFlatRows,
    state/*: { selectedRowIds, expanded, selectedRowPaths },*/ // accessed with const {...} later in code
  } = useTable(
    {
      columns,
      data: data || NO_DATA,
      initialState: {
        sortBy: initialSortBy
      },
      state: {
        selectedRowIds: selectedRows
      }
    },
    useSortBy,
    useExpanded,
    useRowSelect,
    hooks => {
      if (useSelect) {
        hooks.visibleColumns.push(columns => [
          // Let's make a column for selection
          {
            id: 'selection',
            disableSortBy: true,
            // The header can use the table's getToggleAllRowsSelectedProps method
            // to render a checkbox
            Header: ({ getToggleAllRowsSelectedProps }) => (
              <div>
                <IndeterminateCheckbox {...getToggleAllRowsSelectedProps()} />
              </div>
            ),
            // The cell can use the individual row's getToggleRowSelectedProps method
            // to the render a checkbox
            Cell: ({ row }) => {
              return (
                <div>
                  <IndeterminateCheckbox {...row.getToggleRowSelectedProps()} />
                </div>
              )
            },
          },
          ...columns
        ])
      }
      if(useSubComponent){
        hooks.visibleColumns.push(columns => [
          ...columns,
          {
            Header: () => null,
            id: 'expander',
            disableSortBy: true,
            Cell: ({ row }) => (
              <span {...row.getToggleRowExpandedProps()}>
                {row.isExpanded ? <CaretDownIcon /> : <CaretRightIcon />}
              </span>
            )
          }
        ])
      }
    }
  )
  const { selectedRowIds, expanded, selectedRowPaths } = state;
  useEffect(() => {
    setSelectedRows(selectedRowIds)
  }, [setSelectedRows, selectedRowIds])

  if (!data || data.length===0) {
    return (
      <center><Spinner /></center>
    )
  }

  return (
    <Card>
      {header ? (
        <CardHeader>{header(rows, selectedRowIds, selectedFlatRows)}</CardHeader>
      ) : null}
      <CardBody style={{overflow:'auto'}}>
        <table role="grid" className="pf-c-table pf-m-compact pf-m-grid-md" {...getTableProps()}>
          <thead>
            {headerGroups.map((headerGroup, headerGroupIndex) => {
              return (
                <tr role="row" key={headerGroupIndex} {...headerGroup.getHeaderGroupProps()}>
                  {headerGroup.headers.map((column, columnIndex) => {
                    //(
                    // Add the sorting props to control sorting. For this example
                    // we can add them into the header props

                    return (<th role="cell" scope="col" className={clsx({
                      "pf-c-table__sort": !column.disableSortBy,
                      "pf-m-selected": column.isSorted
                    })} key={columnIndex} {...column.getHeaderProps(column.getSortByToggleProps())} >
                      {column.disableSortBy ? (
                        <div>{column.render('Header')}</div>
                      ) : (
                          <button className="pf-c-table__button" type="button">
                            <div className="pf-c-table__button-content">
                              <span className="pf-c-table__text">
                                {column.render('Header')}
                              </span>
                            {/* Add a sort direction indicator */}
                            {column.disableSortBy ? "" : (
                              <span className="pf-c-table__sort-indicator">
                                <i className={clsx("fas", column.isSorted ? (column.isSortedDesc ? "fa-long-arrow-alt-down" : "fa-long-arrow-alt-up") : "fa-arrows-alt-v")}></i>
                              </span>
                            )}
                            </div>
                          </button>
                        )}

                    </th>)
                    //)
                  }
                  )}
                </tr>
              )
            })}
          </thead>
          <tbody {...getTableBodyProps()}>
            {rows.map(
              (row, i) => {
                prepareRow(row);
                if (row.isExpanded) {
                }
                return (
                  <React.Fragment key={i} >
                    <tr {...row.getRowProps()} >
                      {row.cells.map((cell, cellIndex) => {
                        return (
                          <td data-label={typeof cell.column.Header === "string" ? cell.column.Header : cell.column.id || cellIndex} key={cellIndex} {...cell.getCellProps()} >{cell.render('Cell')}</td>
                        )
                      })}
                    </tr>
                    {row.isExpanded ? (
                      <tr>
                        <td colSpan={visibleColumns.length}>
                          {renderRowSubComponent({ row })}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                )
              }
            )}
          </tbody>
        </table>
      </CardBody>
      {footer ? (
        <CardFooter>{footer(rows, selectedRowIds, selectedFlatRows)}</CardFooter>
      ) : null}
    </Card>
  )
}

export default Table;