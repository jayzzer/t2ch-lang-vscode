const langServer = require('vscode-languageserver');

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = langServer.createConnection(langServer.ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
let documents = new langServer.TextDocuments();

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params) => {
	let capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we will fall back using global settings
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	return {
		capabilities: {
            textDocumentSync: documents.syncKind
		}
	};
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(langServer.DidChangeConfigurationNotification.type, undefined);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});


// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings = { maxNumberOfProblems: 1000 };
let globalSettings = defaultSettings;

// Cache the settings of all open documents
let documentSettings = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		// Reset all cached document settings
		documentSettings.clear();
	} else {
		globalSettings = (
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	// Revalidate all open text documents
	documents.all().forEach(validateTextDocument);
});

/**
 * @param {string} resource
 */
function getDocumentSettings(resource) {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 't2chLanguageServer'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

// Only keep settings for open documents
documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

/**
 * 
 * @param {langServer.TextDocument} textDocument 
 */
async function validateTextDocument(textDocument) {
    /**
     * @type {String}
     */
    const fullText = textDocument.getText();

    const openBrackets = fullText.match(/[(]/g) || [];
    const closeBrackets = fullText.match(/[)]/g) || [];
    
    const diagnostics = [];
    
    if (openBrackets.length !== closeBrackets.length) {
        diagnostics.push({
            severity: langServer.DiagnosticSeverity.Error,
            range: {
                start: textDocument.positionAt(fullText.indexOf('(')),
                end: textDocument.positionAt(fullText.indexOf('(') + 1)
            },
            message: `Неправильное количество скобок.`
        });
    }

    const contractKeywordInd = fullText.indexOf('КОНТРАКТ#');
    const resultKeywordInd = fullText.indexOf('РЕЗУЛЬТАТ#');
    if (resultKeywordInd !== -1) {
        const contractBlock = fullText.substring(contractKeywordInd, resultKeywordInd);
        const resultBlock = fullText.substring(resultKeywordInd);

        const varPattern = /_[a-zа-я0-9]*/gi;
        const declaredVars = contractBlock.match(varPattern) || [];

        let m;
        while((m = varPattern.exec(resultBlock))) {
            if (!declaredVars.includes(m.toString())) {
                diagnostics.push({
                    severity: langServer.DiagnosticSeverity.Error,
                    range: {
                        start: textDocument.positionAt(resultKeywordInd + m.index),
                        end: textDocument.positionAt(resultKeywordInd + m.index + m[0].length)
                    },
                    message: `Переменная ${m.toString()} не объявлена.`
                });
            }
        }
    }

	// Send the computed diagnostics to VSCode.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles(_change => {
	// Monitored files have change in VSCode
	connection.console.log('We received an file change event');
});


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
