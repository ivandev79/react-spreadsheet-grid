import React from 'react';
import Grid, { propTypes as gridPropTypes } from '../grid';
import ScrollDummy from './../scrollDummy';
import styles from './styles.css';

const RESERVE_ROWS_COUNT = 10;

class SpreadsheetGridScrollWrapper extends React.PureComponent {
    constructor(props) {
        super(props);

        this.onScroll = this.onScroll.bind(this);
        this.onResize = this.onResize.bind(this);
        this.scrollCalculations = this.scrollCalculations.bind(this);
        this.startColumnResize = this.startColumnResize.bind(this);
        this.processColumnResize = this.processColumnResize.bind(this);

        this.state = {
            first: 0,
            last: this.props.rows.length,
            offset: 0,
            columnWidthValues: {}
        };
    }

    componentDidMount() {
        if (this.props.isColumnsResizable) {
            this.freezeTable(this.props.columnWidthValues);

            document.addEventListener('mousemove', this.processColumnResize, false);
            document.addEventListener('mouseup', () => {
                this.resizingCell = null;
            }, false);
        }

        window.addEventListener('resize', this.onResize, false);

        this.setState({
            last: this.calculateLast(this.state.first)
        });
    }

    componentWillUnmount() {
        if (this.props.isColumnsResizable) {
            window.removeEventListener('resize', this.onWindowResize, false);
            document.removeEventListener('mousemove', this.processColumnResize, false);
            document.removeEventListener('mouseup', () => {
                this.resizingCell = null;
            }, false);
        }

        window.removeEventListener('resize', this.onResize, false);
    }

    freezeTable(columnWidthValues = {}) {
        const table = this.tableElement;

        // There is no grid when Jest is running tests
        if (table) {
            const cells = table.querySelectorAll('.SpreadsheetGrid__headCell');
            const preparedcolumnWidthValues = {};
            let sumOfWidth = 0;

            Object.keys(columnWidthValues).forEach((id) => {
                sumOfWidth += columnWidthValues[id];
            });

            if (sumOfWidth > 100) {
                console.error('react-spreadsheet-grid ERROR: The sum of column width values in ' +
                    'the "columnWidthValues" property is more then 100 percents! ' +
                    'The values are not being used in this condition!');
                columnWidthValues = {};
            }

            let restTableWidth = 100;
            let restColumnsCount = cells.length;

            cells.forEach((cell, i) => {
                const id = this.props.columns[i].id;

                if (columnWidthValues[id]) {
                    preparedcolumnWidthValues[id] = columnWidthValues[id];
                    restTableWidth -= columnWidthValues[id];
                    restColumnsCount--;
                } else {
                    preparedcolumnWidthValues[id] = (restTableWidth / cells.length);
                }
            });

            cells.forEach((cell, i) => {
                const id = this.props.columns[i].id;

                if (!columnWidthValues[id]) {
                    preparedcolumnWidthValues[id] = (restTableWidth / cells.length);
                }
            });

            this.setState({
                columnWidthValues: preparedcolumnWidthValues
            });
        }
    }

    startColumnResize(e) {
        this.resizingCell = e.currentTarget.offsetParent;
        this.resizingCell.startOffset = this.resizingCell.offsetWidth - e.pageX;

        this.nextResizingCell = this.resizingCell.nextSibling;
        this.nextResizingCell.startOffset =
            document.body.offsetWidth -
            this.nextResizingCell.offsetWidth -
            e.pageX;
    }

    processColumnResize(e, nextCell) {
        let direction;
        let sibling;
        const table = this.tableElement;
        const tableWidth = table.offsetWidth;
        const columns = this.props.columns;

        if (this.currentCoords <= e.pageX) {
            direction = 'toRight';
        }

        if (this.resizingCell) {
            const columnWidthValues = Object.assign({}, this.state.columnWidthValues);

            if (direction === 'toRight') {
                const diff = this.resizingCell.startOffset + e.pageX - this.resizingCell.offsetWidth;

                if (this.currentCoords) {
                    sibling = nextCell || this.resizingCell.nextSibling;
                }

                if (this.resizingCell.offsetWidth + diff > 100 &&
                    sibling.offsetWidth - diff > 100) {

                    const prevValue1 = columnWidthValues[columns[this.resizingCell.dataset.index].id];
                    const newValue1 = (this.resizingCell.offsetWidth + diff) * 100 / tableWidth;

                    columnWidthValues[columns[this.resizingCell.dataset.index].id] = newValue1;
                    columnWidthValues[columns[sibling.dataset.index].id] -= newValue1 - prevValue1;

                    this.setState({
                        columnWidthValues
                    });
                } else {
                    let cell;

                    if (nextCell) {
                        cell = nextCell.nextSibling;
                    } else {
                        cell = this.resizingCell.nextSibling.nextSibling;
                    }

                    if (cell) {
                        this.processColumnResize(e, cell);
                    }
                }
            } else {
                if (this.currentCoords) {
                    sibling = nextCell || this.resizingCell;
                }

                const diff = document.body.offsetWidth -
                    e.pageX -
                    this.nextResizingCell.startOffset -
                    this.nextResizingCell.offsetWidth;

                if (sibling.offsetWidth - diff > 100 &&
                    this.nextResizingCell.offsetWidth + diff > 100) {

                    const prevValue1 = columnWidthValues[columns[sibling.dataset.index].id];
                    const newValue1 = (parseInt(sibling.offsetWidth, 10) - diff) * 100 / tableWidth;

                    columnWidthValues[columns[sibling.dataset.index].id] = newValue1;
                    columnWidthValues[columns[this.nextResizingCell.dataset.index].id] -= newValue1 - prevValue1;

                    this.setState({
                        columnWidthValues
                    });

                } else {
                    let cell;

                    if (nextCell) {
                        cell = nextCell.previousSibling;
                    } else {
                        cell = this.resizingCell.previousSibling;
                    }

                    if (cell) {
                        this.processColumnResize(e, cell);
                    }
                }
            }

            if (this.props.onColumnResize) {
                this.props.onColumnResize(columnWidthValues);
            }
        }

        this.currentCoords = e.pageX;
    }

    calculateLast(first) {
        const wrapper = this.scrollWrapperElement;
        const visibleHeight = wrapper
            ? wrapper.parentNode.offsetHeight + 200
            : 0;

        return first + Math.ceil(visibleHeight / this.props.rowHeight);
    }

    scrollCalculations() {
        const scrollTop = Math.max(
            this.scrollWrapperElement.scrollTop,
            0);
        const first = Math.max(0, Math.floor(scrollTop / this.props.rowHeight) - RESERVE_ROWS_COUNT);
        const last = Math.min(this.props.rows.length, this.calculateLast(first) + RESERVE_ROWS_COUNT);

        this.setState({
            first,
            last,
            offset: first * this.props.rowHeight
        });
    }

    onResize() {
        this.scrollCalculations();
    }

    onScroll(e) {
        if (e.target === this.scrollWrapperElement) {
            this.scrollCalculations();
        }
    }

    renderResizer() {
        return (
            <div
                className="SpreadsheetGrid__resizer"
                onMouseDown={this.startColumnResize}
                style={{
                    height: this.props.headerHeight + 'px'
                }}
            />
        );
    }

    renderHeader() {
        const columns = this.props.columns;
        const { columnWidthValues } = this.state;

        return (
            <div className="SpreadsheetGrid__header">
                {
                    columns.map((column, i) => {
                        return (
                            <div
                                key={i}
                                className="SpreadsheetGrid__headCell"
                                data-index={i}
                                style={{
                                    height: this.props.headerHeight + 'px',
                                    width: columnWidthValues
                                        ? columnWidthValues[columns[i].id] + '%'
                                        : 'auto'
                                }}
                            >
                                {typeof column.title === 'string' ? column.title : column.title()}
                                {this.props.isColumnsResizable && this.renderResizer()}
                            </div>
                        );
                    })
                }
            </div>
        );
    }

    render() {
        return (
            <div
                className="SpreadsheetGridContainer"
                ref={(tableElement) => { this.tableElement = tableElement; }}
            >
                {this.renderHeader()}
                <div
                    className="SpreadsheetGridScrollWrapper"
                    onScroll={this.onScroll}
                    ref={node => this.scrollWrapperElement = node}
                    style={{
                        height: `calc(100% - ${this.props.headerHeight}px)`
                    }}
                >
                    <ScrollDummy
                        rows={this.props.rows}
                        headerHeight={this.props.headerHeight}
                        rowHeight={this.props.rowHeight}
                    />
                    {
                        <Grid
                            {...this.props}
                            first={this.state.first}
                            last={this.state.last}
                            offset={this.state.offset}
                            columnWidthValues={this.state.columnWidthValues}
                        />
                    }
                </div>
            </div>
        );
    }
}

SpreadsheetGridScrollWrapper.propTypes = gridPropTypes;

SpreadsheetGridScrollWrapper.defaultProps = {
    rows: [],
    isColumnsResizable: false,
    placeholder: 'There are no rows',
    headerHeight: 40,
    rowHeight: 48
};

export default SpreadsheetGridScrollWrapper;