//smooth dragging algorithm with rotation
//item: the html item that would be draggable
//easeFactor: how slow the item would be following the mouse. 1 for instant
//rotFactor: how extreme the rotation will be. The more the number is the less extreme it'll be. 0 for no rotation

function setItemDraggable(item, easeFactor, rotFactor){
    item.onmousedown = function(eDown){
        let mousePos = {
            x: eDown.pageX,
            y: eDown.pageY
        }

        let diffX = mousePos.x - item.offsetLeft;
        let diffY = mousePos.y - item.offsetTop;

        let itemTop = item.offsetTop;
        let itemLeft = item.offsetLeft;
        let itemDirection = 0;

        let targetX;
        let targetY;

        let interval = setInterval(function(){
            targetX = mousePos.x - diffX;
            targetY = mousePos.y - diffY;

            itemTop += (targetY - itemTop)/easeFactor;
            itemLeft += (targetX - itemLeft)/easeFactor;
            itemDirection = Math.atan((targetX - itemLeft)/rotFactor);
            if(rotFactor == 0) itemDirection = 0;

            item.style.top = `${itemTop}px`;
            item.style.left = `${itemLeft}px`;
            item.style.transform = `rotate(${itemDirection}rad)`
        }, 10);

        document.onmousemove = function(e){
            mousePos = {
                x: e.pageX,
                y: e.pageY
            }
        }

        document.onmouseup = function(){
            clearInterval(interval);
            item.style.transform = null;
            document.onmousemove = null;
            document.onmouseup = null;
        }

        item.ondragstart = function() {
            return false;
        };
    }
}

//smooth drag for code palette items
function setItemPaletteDraggable(item, content, category, insertType, easeFactor, rotFactor, eDown){
    let mousePos = {
        x: eDown.pageX,
        y: eDown.pageY
    }

    let diffX = mousePos.x - item.getBoundingClientRect().x/2;
    let diffY = mousePos.y - item.getBoundingClientRect().y + 10;

    let itemTop = item.getBoundingClientRect().y;
    let itemLeft = item.getBoundingClientRect().x/2;
    let itemDirection = 0;

    let targetX;
    let targetY;

    let targetLine;
    let targetColumn;
    let targetReplace;
    let tempLine;
    let tempSpan;

    if (insertType === 'LINE') {
        tempLine = document.createElement('div');
        tempLine.classList.add('line', 'temp-line', category);
        tempLine.appendChild(document.createTextNode(content));
    } else if (insertType === 'SPAN') {
        tempSpan = document.createElement('span');
        tempSpan.classList.add('temp-span', category);
        tempSpan.innerText = content;
    }

    let overCodeArea = false;

    let interval = setInterval(function(){
        targetX = mousePos.x - diffX;
        targetY = mousePos.y - diffY;

        itemTop += (targetY - itemTop)/easeFactor;
        itemLeft += (targetX - itemLeft)/easeFactor;
        itemDirection = Math.atan((targetX - itemLeft)/rotFactor);
        if(rotFactor == 0) itemDirection = 0;

        item.style.top = `${itemTop}px`;
        item.style.left = `${itemLeft}px`;
        item.style.transform = `rotate(${itemDirection}rad)`;
    }, 10);

    function insertAtColumn(insertColumn, lineEl, insertEl) {
        let column = 0;
        insertEl.remove();
        function insertElIntoElementOrContinue(parent) {
            let child;
            for (child of parent.childNodes) {
                if (child.nodeType === document.TEXT_NODE) {
                    const nodeEndColumn = column + child.textContent.length;
                    const nodeStartColumn = column;
                    if (nodeStartColumn === insertColumn) {
                        // Node STARTS AT insertion column.
                        // Node may be left alone, with inserted element placed before.
                        parent.insertBefore(insertEl, child);
                        return true;
                    } else if (nodeEndColumn > insertColumn) {
                        // Node CONTAINS insertion column.
                        // Node must be broken into two nodes, with inserted element placed between.
                        const sliceColumn = insertColumn - nodeStartColumn;
                        const firstText = child.textContent.slice(0, sliceColumn);
                        const secondText = child.textContent.slice(sliceColumn);
                        const firstNewNode = document.createTextNode(firstText);
                        const secondNewNode = document.createTextNode(secondText);
                        parent.insertBefore(firstNewNode, child);
                        parent.insertBefore(insertEl, child);
                        parent.insertBefore(secondNewNode, child);
                        parent.removeChild(child);
                        return true;
                    } else if (nodeEndColumn === insertColumn) {
                        // Node ENDS AT insertion column.
                        // Node may be left alone, with inserted element placed after.
                        if (child.nextSibling) {
                            parent.insertBefore(insertEl, child.nextSibling);
                        } else {
                            parent.appendChild(insertEl);
                        }
                        return true;
                    } else {
                        // Node ENDS BEFORE insertion column.
                        // Carry on to the next element.
                        column = nodeEndColumn;
                    }
                } else if (child.nodeType === document.ELEMENT_NODE) {
                    if (insertElIntoElementOrContinue(child)) {
                        return true;
                    }
                }
            }
            return false;
        }
        if (!insertElIntoElementOrContinue(lineEl)) {
            // Couldn't find the column to insert the element at.
            // Either an error, or the insertion column is past the end of the line.
            // Assume the latter and append the element to the end of the line.
            lineEl.appendChild(insertEl);
        }
    }

    function findReporterDropPositions(lineText) {
        const positions = [];

        // end of whitespace-only line
        if (lineText.trim() === '') {
            positions.push({column: lineText.length, replace: 0});
        }

        // literals
        let inExpression = false;
        let expressionPosition = null;
        for (let i = 0; i < lineText.length; i++) {
            if (inExpression) {
                if (/[();\[\]]/.test(lineText[i])) {
                    if (expressionPosition) {
                        expressionPosition.replace = i - expressionPosition.column;
                        positions.push(expressionPosition);
                        expressionPosition = null;
                    }
                    inExpression = false;
                }
            } else {
                if (lineText[i] !== ' ') {
                    inExpression = true;
                    if (/[0-9'"]/.test(lineText[i])) {
                        expressionPosition = {column: i};
                    }
                }
            }
        }

        // empty slots
        for (let i = 0; i < lineText.length; i++) {
            if (/[(\[]/.test(lineText[i])) {
                if (lineText[i + 1] && /[)\]]/.test(lineText[i + 1])) {
                    positions.push({column: i + 1, replace: 0});
                }
            }
        }

        return positions;
    }

    document.onmousemove = function(e){
        if (insertType === 'LINE') {
            tempLine.remove();
        } else if (insertType === 'SPAN') {
            tempSpan.remove();
        }

        mousePos = {
            x: e.pageX,
            y: e.pageY
        }

        let codeAreaRect = codeArea.getBoundingClientRect();
        let rectMatchX = mousePos.x > codeAreaRect.x && mousePos.x < codeAreaRect.width+codeAreaRect.x;
        let rectMatchY = mousePos.y > codeAreaRect.y-10 && mousePos.y < codeAreaRect.height+codeAreaRect.y;
        if (!(rectMatchX && rectMatchY)) {
            overCodeArea = false;
            return;
        }
        overCodeArea = true;

        targetLine = Math.round((mousePos.y - codeAreaRect.top + inputArea.scrollTop)/20);
        if (targetLine < 1) return;
        if (targetLine > codeArea.children.length + 1) return;

        targetColumn = Math.round((mousePos.x - codeAreaRect.left - 30 - diffX + inputArea.scrollLeft)/7.2);
        const autoIndentLine = analyseIndent();
        const targetLineEl = codeArea.children[targetLine - 1];
        if (insertType === 'LINE') {
            while (tempLine.firstChild) {
                tempLine.removeChild(tempLine.firstChild);
            }
            tempLine.appendChild(document.createTextNode(contentMatchingIndent()));
            if (targetLineEl) {
                codeArea.insertBefore(tempLine, targetLineEl);
            } else {
                codeArea.appendChild(tempLine);
            }
        } else if (insertType === 'SPAN') {
            if (targetLineEl) {
                const dropPositions = findReporterDropPositions(targetLineEl.innerText);
                const distance = position => Math.min(Math.abs(position.column - targetColumn), Math.abs(position.column + position.replace - targetColumn));
                dropPositions.sort((a, b) => distance(a) - distance(b));
                if (dropPositions[0]) {
                    targetColumn = dropPositions[0].column;
                    targetReplace = dropPositions[0].replace;
                    insertAtColumn(targetColumn, targetLineEl, tempSpan);
                } else {
                    targetColumn = -1;
                }
            }
        }
    }

    function contentMatchingIndent() {
        const autoIndentLine = analyseIndent();
        let inputSplitted = inputArea.value.split('\n');
        let indentLevels = autoIndentLine[targetLine - 1];
        if ((inputSplitted[targetLine - 1] || '').trim().startsWith('}')) {
            indentLevels++;
        }
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            for (let indent = 0; indent < indentLevels; indent++) {
                lines[i] = '    ' + lines[i];
            }
        }
        return lines.join('\n');
    }

    document.onmouseup = function(){
        clearInterval(interval);
        code.style.display = 'block';
        if (insertType === 'LINE') {
            tempLine.remove();
        } else if (insertType === 'SPAN') {
            tempSpan.remove();
        }
        item.style.transform = null;
        document.onmousemove = null;
        document.onmouseup = null;

        if (overCodeArea) {
            let codeSplitted = inputArea.value.split('\n');
            let areaEmpty = false;

            if (codeSplitted == '') {
                areaEmpty = true;
            } else if (insertType === 'LINE') {
                codeSplitted.splice(targetLine-1, 0, contentMatchingIndent());
                if(codeSplitted[targetLine] && codeSplitted[targetLine].trim() == ''){
                    codeSplitted.splice(targetLine, 1)
                }
            } else if (insertType === 'SPAN') {
                const original = codeSplitted[targetLine - 1];
                const beforeTarget = original.slice(0, targetColumn);
                const afterTarget = original.slice(targetColumn + targetReplace);
                codeSplitted[targetLine - 1] = beforeTarget + content + afterTarget;
            }
            inputArea.value = codeSplitted.join('\n');
            let autoIndentLine = analyseIndent();
            inputArea.value = codeSplitted.join('\n');

            if(areaEmpty){
                inputArea.value = content;
            }
        }
        highlight(inputArea.value);
    }
}
