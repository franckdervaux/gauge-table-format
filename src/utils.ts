export const PIPE = '|'
export const SPACE = ' '
export const DASH = '-'
export const TABLELINE = new RegExp(/^(\|.*?)+\|(\ )*$/gm)

export const formatSegments = (lines: String[]): { result: string[][]; counts: number[] } => {
	let counts: number[] = []
	// First calculate the maximum size of each column
	for (let line of lines) {
		// Add leading | if necessary
		if (line[0] !== PIPE)
			line = PIPE + line
		// Add trailing | if necessary, starting by trimming trailing spaces
		line = line.trim()
		if (line[line.length - 1] != PIPE)
			line = line + PIPE
		let segments = line.split(PIPE)
		segments.shift() // As the first character is a |, the first segment is always empty
		segments.pop() // As the last character is a |, the first segment is always empty
		// find the first non-empty segment
		let firstseg = segments.find(seg => seg.trim().length > 0)
		if (firstseg) {
			let separator = segments.every(seg => seg === firstseg![0].repeat(seg.length))
			if (segments && !separator) {
				for (let i = 0; i < segments.length; i++) {
					if (i < counts.length) {
						counts[i] = Math.max(counts[i], segments[i].trim().length)
					}
					else {
						counts.push(segments[i].trim().length)
					}
				}
			}
		}
	}
	// Then, padd each column of each line to the maximum size
	let result: Array<Array<string>> = []
	for (let line of lines) {
		let segments: Array<string>
		if ((line.match(/\|/g) || []).length > 1) { // ignore lines that don't have at least two | characters
			// Add leading | if necessary
			if (line[0] !== PIPE)
				line = PIPE + line
			// Add trailing | if necessary, starting by trimming trailing spaces
			line = line.trim()
			if (line[line.length - 1] != PIPE)
				line = line + PIPE
			segments = line.split(PIPE)
			segments.shift()
			segments.pop()
			let padding = SPACE
			let firstseg = segments.find(seg => seg.trim().length > 0)
			if (firstseg && segments.every(seg => seg === firstseg![0].repeat(seg.length))) {
				padding = firstseg![0]
				for (let i = 0; i < segments.length; i++) {
					segments[i] = padding.repeat(counts[i] + 2)
				}
			}
			else {
				for (let i = 0; i < segments.length; i++) {
					segments[i] = padding + segments[i].trim() + padding.repeat(counts[i] - segments[i].trim().length) + padding
				}
			}
			if (segments.length < counts.length) {
				// complete incomplete lines
				for (let j = segments.length; j < counts.length; j++) {
					segments.push(padding.repeat(counts[j] + 2)) // +2 to account for added spaces
				}
			}
			result.push(segments)
		}
	}
	return { result, counts }
}

export const buildResultString = (segments: string[][], ignoreEmptyLines: boolean = true): string => {
	let result = ''
	for (let seg of segments) {
		if (!ignoreEmptyLines || !seg.every(column => column.trim() === '')) {
			result += PIPE + seg.join(PIPE) + PIPE + '\n'
		}
	}
	// remove trailing /n
	result = result.substr(0, result.length - 1)
	return result
}	