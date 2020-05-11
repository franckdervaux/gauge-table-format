import * as assert from 'assert';
import { formatSegments, buildResultString } from '../../utils'

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../extension';

suite('Formatting Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Basic format', () => {
		let input = [
			"|first|second|",
			"|john|doe|"
		]
		let result = [
			[ " first ", " second " ],
			[ " john  ", " doe    " ],
		]
		let counts = [
			5,
			6
		]
		assert.deepStrictEqual({ result, counts}, formatSegments(input));
	});

	test('Incomplete column', () => {
		let input = [
			"|first|second",
			"|john|doe|"
		]
		let result = [
			[ " first ", " second " ],
			[ " john  ", " doe    " ],
		]
		let counts = [
			5,
			6
		]
		assert.deepStrictEqual({ result, counts}, formatSegments(input));
	});

	test('Missing column', () => {
		let input = [
			"|first|second",
			"|john|"
		]
		let result = [
			[ " first ", " second " ],
			[ " john  ", "        " ],
		]
		let counts = [
			5,
			6
		]
		assert.deepStrictEqual({ result, counts}, formatSegments(input));
	});
});

suite('Building Result String Test Suite', () => {
	test('Basic table', () => {
		const segments = [
			[ "123", "4567" ],
			[ "---", "----" ],
			[ "abc", "defg" ]
		]
		const result = "|123|4567|\n|---|----|\n|abc|defg|"

		assert.deepStrictEqual(result, buildResultString(segments))
	})
});
