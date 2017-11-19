import React from 'react';
import PropTypes from 'prop-types';
import find from 'lodash.find';
import findIndex from 'lodash.findindex';
import slice from 'lodash.slice';
import isEqual from 'lodash.isequal';
import keys from './../kit/keymap';
import Row from './row';

import './styles.css';

class SpreadsheetGrid extends React.PureComponent {
    constructor(props) {
        super(props);

        this.onGlobalKeyDown = this.onGlobalKeyDown.bind(this);
        this.onGlobalClick = this.onGlobalClick.bind(this);
        this.onCellClick = this.onCellClick.bind(this);
        this.onCellDoubleClick = this.onCellDoubleClick.bind(this);
        this.getCellClassName = this.getCellClassName.bind(this);

        this.state = {
            disabledCells: this.getDisabledCells(this.props.rows, this.props.checkDisabledCell)
        };

        if (this.props.focusedCell) {
            this.state.activeCell = this.props.focusedCell;
            this.state.focusedCell = this.props.focusedCell;

            this.skipGlobalClick = true;
        }
    }

    componentDidMount() {
        document.addEventListener('keydown', this.onGlobalKeyDown, false);
        document.addEventListener('click', this.onGlobalClick, false);
    }

    componentWillReceiveProps(newProps) {
        if (this.props.rows !== newProps.rows && newProps.checkDisabledCell) {
            const disabledCells = this.getDisabledCells(newProps.rows, newProps.checkDisabledCell);
            const newState = {
                disabledCells
            };

            if (find(disabledCells, this.state.activeCell)) {
                newState.activeCell = null;
            }
            if (find(disabledCells, this.state.focusedCell)) {
                newState.focusedCell = null;
            }

            this.setState(newState);
        }

        if (newProps.focusedCell) {
            const newActiveCell = newProps.focusedCell;

            this.setState({
                activeCell: newActiveCell,
                focusedCell: newActiveCell
            });
            this.skipGlobalClick = true;
        }

        if (newProps.blurFocus) {
            this.setState({
                focusedCell: null
            });
        }
    }

    componentDidUpdate() {
        document.removeEventListener('keydown', this.onGlobalKeyDown, false);
        document.addEventListener('keydown', this.onGlobalKeyDown, false);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.onGlobalKeyDown, false);
        document.removeEventListener('click', this.onGlobalClick, false);
    }

    getDisabledCells(rows, checkDisabledCell) {
        const disabledCells = [];

        if (checkDisabledCell) {
            rows.forEach((row, x) => {
                this.props.columns.forEach((column, y) => {
                    if (checkDisabledCell(row, column.id)) {
                        disabledCells.push({ x, y });
                    }
                });
            });
        }

        return disabledCells;
    }

    onGlobalKeyDown(e) {
        const block = this;
        const columnsCount = this.props.columns.length;
        const rowsCount = this.props.rows.length;

        let newActiveCell = this.state.activeCell;
        let newFocusedCell = this.state.focusedCell;

        if (this.state.activeCell) {
            const { x, y } = this.state.activeCell;

            newFocusedCell = this.state.activeCell;

            function moveRight({ x, y }) {
                if (y < columnsCount - 1) {
                    newActiveCell = { x, y: y + 1 };
                } else if (x < rowsCount - 1) {
                    newActiveCell = { x: x + 1, y: 0 };
                }
                newFocusedCell = null;

                if (find(block.state.disabledCells, newActiveCell)) {
                    moveRight(newActiveCell);
                }
            }

            function moveDown({ x, y }) {
                if (x < rowsCount - 1) {
                    newActiveCell = { x: x + 1, y };
                }
                newFocusedCell = null;

                if (find(block.state.disabledCells, newActiveCell)) {
                    moveDown(newActiveCell);
                }
            }

            function moveUp({ x, y }) {
                if (x > 0) {
                    newActiveCell = { x: x - 1, y };
                }
                newFocusedCell = null;

                if (find(block.state.disabledCells, newActiveCell)) {
                    moveUp(newActiveCell);
                }
            }

            function moveLeft({ x, y }) {
                if (y > 0) {
                    newActiveCell = { x, y: y - 1 };
                } else if (x > 0) {
                    newActiveCell = { x: x - 1, y: columnsCount - 1 };
                }
                newFocusedCell = null;

                if (find(block.state.disabledCells, newActiveCell)) {
                    moveLeft(newActiveCell);
                }
            }

            if (!this.state.focusedCell) {
                if (e.keyCode === keys.RIGHT) {
                    moveRight({ x, y });
                }

                if (e.keyCode === keys.LEFT) {
                    moveLeft({ x, y });
                }

                if (e.keyCode === keys.UP) {
                    e.preventDefault();
                    moveUp({ x, y });
                }

                if (e.keyCode === keys.DOWN) {
                    e.preventDefault();
                    moveDown({ x, y });
                }

                if (e.keyCode === keys.ALT) {
                    newFocusedCell = null;
                }
            }

            if (e.keyCode === keys.ENTER) {
                if (this.state.focusedCell) {
                    moveDown({ x, y });
                    e.target.blur();
                } else {
                    newFocusedCell = this.state.activeCell;
                }
            }

            if (e.keyCode === keys.TAB) {
                if (this.state.focusedCell) {
                    moveRight({ x, y });
                    e.target.blur();
                } else {
                    newFocusedCell = this.state.activeCell;
                }

                e.preventDefault();
            }

            if (e.keyCode === keys.ESC) {
                if (this.state.focusedCell) {
                    e.target.blur();
                    newFocusedCell = null;
                }
            }

            this.setState({
                activeCell: newActiveCell,
                focusedCell: newFocusedCell
            });
        }
    }

    onGlobalClick() {
        if (!this.skipGlobalClick) {
            this.setState({
                activeCell: null,
                focusedCell: null
            });
        } else {
            this.skipGlobalClick = false;
        }
    }

    onCellClick(x, y, row, columnId, e) {
        if (!find(this.state.disabledCells, { x, y })) {
            if (!e.skipCellClick && !isEqual(this.state.focusedCell, { x, y })) {
                this.setState({
                    focusedCell: e.target !== e.currentTarget ? { x, y } : null,
                    activeCell: { x, y }
                });
            }
        }

        if (this.props.onCellClick) {
            this.props.onCellClick(row, columnId);
        }

        this.skipGlobalClick = true;
    }

    onCellDoubleClick(x, y) {
        if (!find(this.state.disabledCells, { x, y })) {
            this.setState({
                activeCell: { x, y },
                focusedCell: { x, y }
            });
        }
    }

    getCellClassName(column, row, x, y) {
        return 'SpreadsheetGrid__cell' +
            (isEqual(this.state.activeCell, { x, y }) ? ' SpreadsheetGrid__cell_active' : '') +
            (isEqual(this.state.focusedCell, { x, y }) ? ' SpreadsheetGrid__cell_focused' : '') +
            (this.props.checkDisabledCell && this.props.checkDisabledCell(row, column.id)
                ? ' SpreadsheetGrid__cell_disabled'
                : '');
    }

    calculatePosition() {
        return this.props.offset + 'px';
    }

    renderBody() {
        const rows = [].concat(slice(
            this.props.rows,
            this.props.first,
            this.props.last
        ));
        const columns = this.props.columns;
        let body;

        if (rows.length) {
            body = rows.map((row) => {
                return (
                    <Row
                        x={findIndex(this.props.rows, row)}
                        key={this.props.getRowKey(row)}
                        columns={columns}
                        row={row}
                        getCellClassName={this.getCellClassName}
                        onCellClick={this.onCellClick}
                        onCellDoubleClick={this.onCellDoubleClick}
                        activeCell={this.state.activeCell}
                        focusedCell={this.state.focusedCell}
                        disabledCells={this.state.disabledCells}
                        height={this.props.cellHeight}
                        widthValues={this.props.widthValues}
                    />
                );
            });
        } else {
            body = (
                <div className="SpreadsheetGrid__placeholder">
                    {this.props.placeholder}
                </div>
            );
        }

        return body;
    }

    render() {
        return (
            <div
                className="SpreadsheetGrid"
                style={{
                    top: this.calculatePosition()
                }}
            >
                {this.renderBody()}
            </div>
        );
    }
}

export const propTypes = {
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string,
            title: PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.func
            ]),
            value: PropTypes.func.isRequired
        })
    ).isRequired,
    rows: PropTypes.arrayOf(PropTypes.any),
    getRowKey: PropTypes.func.isRequired,
    placeholder: PropTypes.string,
    checkDisabledCell: PropTypes.func,
    focusedCell: PropTypes.shape({
        x: PropTypes.number.isRequired,
        y: PropTypes.number.isRequired
    }),
    onCellClick: PropTypes.func,
    blurFocus: PropTypes.bool,

    // scroll
    headerHeight: PropTypes.number,
    cellHeight: PropTypes.number,
    first: PropTypes.number,
    last: PropTypes.number,
    offset: PropTypes.number,

    // resize
    columnsResize: PropTypes.bool,
    onColumnResize: PropTypes.func,
    widthValues: PropTypes.object
};

SpreadsheetGrid.defaultProps = {
    blurFocus: false
};

SpreadsheetGrid.propTypes = propTypes;

export default SpreadsheetGrid;
