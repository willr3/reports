import React, { useRef, useState, useMemo, useEffect } from 'react';
import Editor, { monaco as getMonaco, ControlledEditor } from '@monaco-editor/react';
import {
    global_BackgroundColor_200,
    global_Color_400,
    global_active_color_200,
} from '@patternfly/react-tokens';
import * as css from '@patternfly/react-tokens';

import raw from "raw.macro";
const rawLuxonTypes = raw("../../node_modules/@types/luxon/index.d.ts").replace(/export /g, "");

let monaco;
getMonaco
    .init()
    .then(_monaco => {
        monaco = _monaco;
        monaco.editor.defineTheme('github',
            {
                "base": "vs",
                "inherit": true,
                "rules": [
                    {
                        "foreground": "999988",
                        "fontStyle": "italic",
                        "token": "comment"
                    },
                    {
                        "foreground": "999999",
                        "fontStyle": "bold",
                        "token": "comment.block.preprocessor"
                    },
                    {
                        "foreground": "999999",
                        "fontStyle": "bold italic",
                        "token": "comment.documentation"
                    },
                    {
                        "foreground": "999999",
                        "fontStyle": "bold italic",
                        "token": "comment.block.documentation"
                    },
                    {
                        "foreground": "a61717",
                        "background": "e3d2d2",
                        "token": "invalid.illegal"
                    },
                    {
                        "fontStyle": "bold",
                        "token": "keyword"
                    },
                    {
                        "fontStyle": "bold",
                        "token": "storage"
                    },
                    {
                        "fontStyle": "bold",
                        "token": "keyword.operator"
                    },
                    {
                        "fontStyle": "bold",
                        "token": "constant.language"
                    },
                    {
                        "fontStyle": "bold",
                        "token": "support.constant"
                    },
                    {
                        "foreground": "445588",
                        "fontStyle": "bold",
                        "token": "storage.type"
                    },
                    {
                        "foreground": "445588",
                        "fontStyle": "bold",
                        "token": "support.type"
                    },
                    {
                        "foreground": "008080",
                        "token": "entity.other.attribute-name"
                    },
                    {
                        "foreground": "0086b3",
                        "token": "variable.other"
                    },
                    {
                        "foreground": "999999",
                        "token": "variable.language"
                    },
                    {
                        "foreground": "445588",
                        "fontStyle": "bold",
                        "token": "entity.name.type"
                    },
                    {
                        "foreground": "445588",
                        "fontStyle": "bold",
                        "token": "entity.other.inherited-class"
                    },
                    {
                        "foreground": "445588",
                        "fontStyle": "bold",
                        "token": "support.class"
                    },
                    {
                        "foreground": "008080",
                        "token": "variable.other.constant"
                    },
                    {
                        "foreground": "800080",
                        "token": "constant.character.entity"
                    },
                    {
                        "foreground": "990000",
                        "token": "entity.name.exception"
                    },
                    {
                        "foreground": "990000",
                        "token": "entity.name.function"
                    },
                    {
                        "foreground": "990000",
                        "token": "support.function"
                    },
                    {
                        "foreground": "990000",
                        "token": "keyword.other.name-of-parameter"
                    },
                    {
                        "foreground": "555555",
                        "token": "entity.name.section"
                    },
                    {
                        "foreground": "000080",
                        "token": "entity.name.tag"
                    },
                    {
                        "foreground": "008080",
                        "token": "variable.parameter"
                    },
                    {
                        "foreground": "008080",
                        "token": "support.variable"
                    },
                    {
                        "foreground": "009999",
                        "token": "constant.numeric"
                    },
                    {
                        "foreground": "009999",
                        "token": "constant.other"
                    },
                    {
                        "foreground": "dd1144",
                        "token": "string - string source"
                    },
                    {
                        "foreground": "dd1144",
                        "token": "constant.character"
                    },
                    {
                        "foreground": "009926",
                        "token": "string.regexp"
                    },
                    {
                        "foreground": "990073",
                        "token": "constant.other.symbol"
                    },
                    {
                        "fontStyle": "bold",
                        "token": "punctuation"
                    },
                    {
                        "foreground": "000000",
                        "background": "ffdddd",
                        "token": "markup.deleted"
                    },
                    {
                        "fontStyle": "italic",
                        "token": "markup.italic"
                    },
                    {
                        "foreground": "aa0000",
                        "token": "markup.error"
                    },
                    {
                        "foreground": "999999",
                        "token": "markup.heading.1"
                    },
                    {
                        "foreground": "000000",
                        "background": "ddffdd",
                        "token": "markup.inserted"
                    },
                    {
                        "foreground": "888888",
                        "token": "markup.output"
                    },
                    {
                        "foreground": "888888",
                        "token": "markup.raw"
                    },
                    {
                        "foreground": "555555",
                        "token": "markup.prompt"
                    },
                    {
                        "fontStyle": "bold",
                        "token": "markup.bold"
                    },
                    {
                        "foreground": "aaaaaa",
                        "token": "markup.heading"
                    },
                    {
                        "foreground": "aa0000",
                        "token": "markup.traceback"
                    },
                    {
                        "fontStyle": "underline",
                        "token": "markup.underline"
                    },
                    {
                        "foreground": "999999",
                        "background": "eaf2f5",
                        "token": "meta.diff.range"
                    },
                    {
                        "foreground": "999999",
                        "background": "eaf2f5",
                        "token": "meta.diff.index"
                    },
                    {
                        "foreground": "999999",
                        "background": "eaf2f5",
                        "token": "meta.separator"
                    },
                    {
                        "foreground": "999999",
                        "background": "ffdddd",
                        "token": "meta.diff.header.from-file"
                    },
                    {
                        "foreground": "999999",
                        "background": "ddffdd",
                        "token": "meta.diff.header.to-file"
                    },
                    {
                        "foreground": "4183c4",
                        "token": "meta.link"
                    }
                ],
                "colors": {
                    "editor.foreground": "#000000",
                    "editor.background": "#F8F8FF",
                    "editor.selectionBackground": "#B4D5FE",
                    "editor.lineHighlightBackground": "#FFFEEB",
                    "editorCursor.foreground": "#666666",
                    "editorWhitespace.foreground": "#BBBBBB"
                }
            })
        monaco.editor.defineTheme('patternfly', {
            base: 'vs',
            inherit: true,
            rules: [{ background: global_BackgroundColor_200.value /*'EDF9FA'*/ }],
            colors: {
                'editor.foreground': global_Color_400.value, //'#000000',
                'editor.background': global_BackgroundColor_200.value, //'#EDF9FA',
                'editorCursor.foreground': '#8B0000',
                'editor.lineHighlightBackground': global_active_color_200.value, //'#0000FF20',
                'editorLineNumber.foreground': '#008800',
                'editor.selectionBackground': '#88000030',
                'editor.inactiveSelectionBackground': '#88000015'
            }
        })
        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            //noLib: true, //turns of Array and map too :(
            allowNonTsExtensions: true
        });
        monaco.languages.typescript.javascriptDefaults.addExtraLib(
            rawLuxonTypes,
            'luxon.js'
        )
        monaco.languages.typescript.javascriptDefaults.addExtraLib([
            `declare namespace jsonpath { 
            function query(data: object, path: string): object; 
            function value(data: object, path: string): object;}
        `,
            //'declare function query(data:object,path:string):object'
        ].join('\n'),
            'jsonpath.js'
            //'file:///node_modules/@types/luxon/index.d.ts'
        )
        monaco.languages.registerCompletionItemProvider('javascript', {
            provideCompletionItems: function (model, position) {
                var textUntilPosition = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
                var word = model.getWordUntilPosition(position);
                if (textUntilPosition.length > word.word.length) {
                    var prevWord = model.getWordUntilPosition({
                        ...position,
                        column: (word.startColumn - 1)
                    })
                    //console.log("prevWord", prevWord)
                }
                var range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                }
                //console.log("completion", { textUntilPosition, position, word, range })
                return {
                    suggestions: [
                        // {
                        //     label: 'jsonpath.value',
                        //     kind: monaco.languages.CompletionItemKind.Function,
                        //     documentation: 'jsonpath find a single result',
                        //     insertText: "jsonpath.value(${1:data},${2:path})",
                        //     insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        //     range: range

                        // },
                        // {
                        //     label: 'jsonpath.query',
                        //     kind: monaco.languages.CompletionItemKind.Function,
                        //     documentation: 'jsonpath find all matches',
                        //     insertText: "jsonpath.query(${1:data},${2:path})",
                        //     insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        //     range: range
                        // },
                        // {
                        //     label: 'DateTime',
                        //     kind: monaco.languages.CompletionItemKind.Function,
                        //     documentation: 'DateTime library',
                        //     insertText: "DateTime.",
                        //     range: range
                        // }
                    ]
                }
            }
        })
        /* here is the instance of monaco, so you can use the `monaco.languages` or whatever you want */
    })
    .catch(error => console.error('An error occurred during initialization of Monaco: ', error));

export default ({ height = "100%", value = "{}", onChange = (enewValue) => { }, language = "javascript", setValueGetter = (v) => { }, setEditor = (v) => { }, options = {} }) => {
    const valueGetter = useRef();
    const [myEditor, setMyEditor] = useState(false);
    let myHeight = 5+value.split("\n").length * 19;//valueGetter && valueGetter.current ? valueGetter.current.getValue().split("\n").length*19 : 3*19

    if (myEditor) {
        setTimeout(() => {
            myEditor.layout()
        }, 0)
    }
    useEffect(() => {
        const key = Date.now()
        if (window.resizers) {
            const cb = () => {
                if (myEditor) {
                    myEditor.layout();
                }
            }
            window.resizers[key] = cb
        }
        return () => {
            if(window.resizer){
                delete window.resizer[key]
            }
        }
    })

    const editorWillMount = (monaco) => {
        /*
                monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            schemas: [{
                uri: "http://myserver/foo-schema.json",
                fileMatch: ['*'],
                schema: {
                    type: "object",
                    properties: {
                        p1: {
                            enum: [ "v1", "v2"]
                        },
                        p2: {
                            $ref: "http://myserver/bar-schema.json"
                        }
                    }
                }
            }]
        });

        */
    }
    const editorDidMount = (getter, editor) => {

        //https://github.com/microsoft/monaco-editor/issues/794
        editor.onDidChangeModelDecorations(() => {
            updateEditorHeight() // typing
            requestAnimationFrame(updateEditorHeight) // folding
        })

        let prevHeight = 0

        const updateEditorHeight = () => {
            const editorElement = editor.getDomNode()
            const editorContainerElement = editor.getContainerDomNode();
            if (!editorElement) {
                return
            }

            const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight)
            const lineCount = editor.getModel()?.getLineCount() || 1
            const height = editor.getTopForLineNumber(lineCount + 1) + lineHeight + 5

            if (prevHeight !== height) {
                myHeight = height;
                prevHeight = height
                if (editorElement.parentElement) {
                    editorElement.parentElement.style.height = `${height}px`
                    if (editorElement.parentElement.parentElement) {
                        editorElement.parentElement.parentElement.style.height = `${height}px`
                    }
                }
                editorElement.style.height = `${height}px`
                editorContainerElement.style.height = `${height}px`
                editor.layout()
            }
        }


        valueGetter.current = getter;
        setValueGetter({ getValue: () => valueGetter.current() });
        setEditor(editor)
        setMyEditor(editor);
        editor.addAction({
            id: 'my-unique-id',
            label: 'my label',
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S
            ],
            precondition: null,
            keybindingContext: null,
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.5,
            run: function (ed) {
                onChange(valueGetter.current())
                return null;
            }
        })
        editor.addAction({
            id: 'my-unique-id2',
            label: 'my label2',
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_R
            ],
            precondition: null,
            keybindingContext: null,
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.5,
            run: function (ed) {
                return null;
            }
        })
    }
    return (
        <Editor
            height={myHeight}//7.5ex, 10vh
            value={value}//value
            language={language}
            theme="patternfly"
            options={{
                ...options,
                activityBar: {
                    visible: false,
                },
                minimap: {
                    enabled: false
                },
                scrollbar: {
                    vertical: 'hidden',
                    handleMouseWheel: false,

                },
                scrollBeyondLastLine: false,
                lineNumbers: 'off',
                lineHeight: 19,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 0,
                glyphMargin: false,
                folding: false,
                showFoldingControls: 'never',


            }}

            editorDidMount={editorDidMount}
            editorWillMount={editorWillMount}
        />
    )
}