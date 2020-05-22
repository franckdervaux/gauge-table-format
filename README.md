# nicegaugetables VS Code extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This extension is helping to create and maintain tables.
A table is defined by columns separated by the | character. It can have separator lines where the content of each column is a series of - characters.

For example, it transforms

    |First Name|Last Name|Town|  
    |Jonathan|Guywithaverylonglastname|Seattle|  
    |John|Doe|Buenos Aeres|

into

    | First Name | Last Name                | Town         |  
    | Jonathan   | Guywithaverylonglastname | Seattle      |  
    | John       | Doe                      | Buenos Aeres |


## Features

Command: `View Table Panel`

![Demo](https://github.com/franckdervaux/gauge-table-format/blob/master/publicmedia/viewpanel.gif?raw=true)

Displays the panel offering icon buttons to perform table commands.

Command: `Format Gauge Table`

Properly format the table surrounding the cursor position. It makes all columns of the same width on all lines and add missing columns.

![Demo](https://github.com/franckdervaux/gauge-table-format/blob/master/publicmedia/formattable.gif?raw=true)

Command: `Create Gauge Table`

Creates a table by asking for the number of rows and columns. It automatically creates a header row followed by a separator row.

![Demo](https://github.com/franckdervaux/gauge-table-format/blob/master/publicmedia/createtable.gif?raw=true)

Command: `Delete Gauge Table`

Deletes the table surrounding the cursor position. 

![Demo](https://github.com/franckdervaux/gauge-table-format/blob/master/publicmedia/deletetable.gif?raw=true)

Command: `Delete Gauge Column`

Deletes the column containing the cursor. 

![Demo](https://github.com/franckdervaux/gauge-table-format/blob/master/publicmedia/deletecolumn.gif?raw=true)

Command: `Append Gauge Column`

Adds a new empty column to the right of the one containing the cursor.

![Demo](https://github.com/franckdervaux/gauge-table-format/blob/master/publicmedia/appendcolumn.gif?raw=true)

Command: `Append Gauge Row`

Adds a new empty row below the one containing the cursor.

![Demo](https://github.com/franckdervaux/gauge-table-format/blob/master/publicmedia/appendrow.gif?raw=true)

Command: `Delete Empty Rows`

Delete all empty rows of a table.

![Demo](https://github.com/franckdervaux/gauge-table-format/blob/master/publicmedia/deleteemptyrows.gif?raw=true)

## Release Notes

### 1.0.0

Initial release of the extension.
