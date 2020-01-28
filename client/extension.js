const vscode = require('vscode');
const path = require('path');
const langClient = require('vscode-languageclient');


/**
 * @type {langClient.LanguageClient}
 */
let client;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	console.log('Congratulations, your extension "t2ch-lang" is now active!');

    const serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
    const debugOptions = {
        execArgv: [
            '--nolazy', '--inspect=6009'
        ]
    };

    const serverOptions = {
        run: {
            module: serverModule,
            transport: langClient.TransportKind.ipc
        },
        debug: {
            module: serverModule,
            transport: langClient.TransportKind.ipc,
            options: debugOptions
        }
    };

    const clientOptions = {
        documentSelector: [{
            scheme: 'file',
            language: 't2ch'
        }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };

    client = new langClient.LanguageClient(
        't2chLanguageServer',
        'T2CH Language Server',
        serverOptions,
        clientOptions
    );

    client.start();

    // KEYWORD SNIPPETS
    vscode.languages.registerCompletionItemProvider(
        't2ch',
        {
            provideCompletionItems(document, position) {
                const completionList = [];

                const contractCompletion = new vscode.CompletionItem('КОНТРАКТ#', vscode.CompletionItemKind.Keyword);
                contractCompletion.insertText = new vscode.SnippetString('\rКОНТРАКТ#\n\t');
                contractCompletion.keepWhitespace = true;

                const resultCompletion = new vscode.CompletionItem('РЕЗУЛЬТАТ#', vscode.CompletionItemKind.Keyword);
                resultCompletion.insertText = new vscode.SnippetString('\rРЕЗУЛЬТАТ#\n\t');
                resultCompletion.keepWhitespace = true;

                const linePrefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
                if (linePrefix.includes('КОНТРАКТ#')) {
                    completionList.push(resultCompletion);
                } else {
                    completionList.push(contractCompletion);
                    completionList.push(resultCompletion);
                }

                return completionList;
            }
        },
        '*'
    );

    // FUNCTION SNIPPETS
    vscode.languages.registerCompletionItemProvider(
        't2ch',
        {
            provideCompletionItems(document, position, _token, context) {
                const completionList = [];
                const triggerChar = context.triggerCharacter;

                const scoreCompletion = new vscode.CompletionItem('^ВЕС', vscode.CompletionItemKind.Function);
                const authorCompletion = new vscode.CompletionItem('^АВТОР', vscode.CompletionItemKind.Function);
                const conditionCompletion = new vscode.CompletionItem('^УСЛ', vscode.CompletionItemKind.Function);
                const lengthCompletion = new vscode.CompletionItem('^ДЛИНА', vscode.CompletionItemKind.Function);

                if (triggerChar) {
                    authorCompletion.insertText = new vscode.SnippetString('АВТОР( $0 )');
                    scoreCompletion.insertText = new vscode.SnippetString('ВЕС( $0 )');
                    conditionCompletion.insertText = new vscode.SnippetString('УСЛ( $1 ?\n\t$2 |\n\t$3\n)');
                    lengthCompletion.insertText = new vscode.SnippetString('ДЛИНА( $0 )');
                } else {
                    authorCompletion.insertText = new vscode.SnippetString('^АВТОР( $0 )');
                    scoreCompletion.insertText = new vscode.SnippetString('^ВЕС( $0 )');
                    conditionCompletion.insertText = new vscode.SnippetString('^УСЛ( $1 ?\n\t$2 |\n\t$3\n)');
                    lengthCompletion.insertText = new vscode.SnippetString('^ДЛИНА( $0 )');
                }
                
                const linePrefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
                if (linePrefix.includes('РЕЗУЛЬТАТ#')) {
                    completionList.push(scoreCompletion, authorCompletion, conditionCompletion, lengthCompletion);
                }

                return completionList;
            }
        },
        '^'
    );

    // TYPE SNIPPETS
    vscode.languages.registerCompletionItemProvider(
        't2ch',
        {
            provideCompletionItems(document, position, _token, context) {
                const completionList = [];
                const triggerChar = context.triggerCharacter;
                
                let timeCompletion;
                let wordCompletion;
                let letterCompletion;
                let numberCompletion;
                let playerCompletion;
                
                if (triggerChar) {
                    timeCompletion = new vscode.CompletionItem('слово', vscode.CompletionItemKind.TypeParameter);
                    wordCompletion = new vscode.CompletionItem('время', vscode.CompletionItemKind.TypeParameter);
                    letterCompletion = new vscode.CompletionItem('буква', vscode.CompletionItemKind.TypeParameter);
                    numberCompletion = new vscode.CompletionItem('число', vscode.CompletionItemKind.TypeParameter);
                    playerCompletion = new vscode.CompletionItem('игрок', vscode.CompletionItemKind.TypeParameter);
                } else {
                    timeCompletion = new vscode.CompletionItem('$слово', vscode.CompletionItemKind.TypeParameter);
                    wordCompletion = new vscode.CompletionItem('$время', vscode.CompletionItemKind.TypeParameter);
                    letterCompletion = new vscode.CompletionItem('$буква', vscode.CompletionItemKind.TypeParameter);
                    numberCompletion = new vscode.CompletionItem('$число', vscode.CompletionItemKind.TypeParameter);
                    playerCompletion = new vscode.CompletionItem('$игрок', vscode.CompletionItemKind.TypeParameter);
                }
                
                completionList.push(timeCompletion, wordCompletion, letterCompletion, numberCompletion, playerCompletion);

                return completionList;
            }
        },
        '$'
    );

    // VAR SNIPPETS
    vscode.languages.registerCompletionItemProvider(
        't2ch',
        {
            provideCompletionItems(document) {
                const contractIndex = document.getText().indexOf('КОНТРАКТ#');
                const resultIndex = document.getText().indexOf('РЕЗУЛЬТАТ#');
                if (contractIndex == -1 || resultIndex == -1) return;

                const completionList = [];
                
                const contractBlock = document.getText(new vscode.Range(document.positionAt(contractIndex), document.positionAt(resultIndex)));
                const declaredVars = contractBlock.match(/_[a-zа-я0-9]*/gi);

                declaredVars.forEach( (variable) => {
                    const completionItem = new vscode.CompletionItem(variable, vscode.CompletionItemKind.Variable);
                    completionList.push(completionItem);
                } );

                return completionList;
            }
        },
        '_'
    );
}
exports.activate = activate;


function deactivate() {
    if (!client) {
        return undefined;
    }

    return client.stop();
}

module.exports = {
	activate,
	deactivate
}
