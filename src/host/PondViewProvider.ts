import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { isWebviewMessage, type HostMessage } from '../shared/protocol';

/**
 * Hosts the pond webview in the Explorer sidebar.
 * The webview is presentation only; all game rules live in the extension host.
 */
export class PondViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'froggit.pond';

  private view?: vscode.WebviewView;

  /**
   * @param getSnapshot Builds the full current state. Sent whenever the webview
   *   (re)loads, because a hidden webview is destroyed and misses events.
   * @param onCustomize Called with the look the user picked. Not yet validated.
   */
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly getSnapshot: () => HostMessage,
    private readonly onCustomize: (raw: unknown) => void,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;

    const webview = webviewView.webview;
    webview.options = {
      enableScripts: true,
      // The webview may only load files from these two folders.
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'media'),
        vscode.Uri.joinPath(this.extensionUri, 'dist'),
      ],
    };
    webview.html = this.getHtml(webview);

    webview.onDidReceiveMessage((message: unknown) => {
      if (!isWebviewMessage(message)) return;
      if (message.type === 'ready') this.post(this.getSnapshot());
      else if (message.type === 'customize') this.onCustomize(message.customization);
    });

    webviewView.onDidDispose(() => {
      this.view = undefined;
    });
  }

  /** Sends a message if the pond is open. Dropped otherwise; the next snapshot catches up. */
  post(message: HostMessage): void {
    void this.view?.webview.postMessage(message);
  }

  private getHtml(webview: vscode.Webview): string {
    const nonce = randomBytes(16).toString('base64');
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js'),
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'pond.css'),
    );

    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data:`,
      `style-src ${webview.cspSource}`,
      `script-src 'nonce-${nonce}'`,
    ].join('; ');

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>Frog Pond</title>
</head>
<body>
  <canvas id="pond" aria-label="A pixel-art frog in a pond"></canvas>
  <div id="hud" hidden>
    <span id="stage-name"></span>
    <div class="xp-bar"><div id="xp-fill"></div></div>
    <span id="xp-text"></span>
  </div>
  <div id="floaters"></div>
  <div id="whisper" class="whisper" role="status" hidden></div>
  <button id="wardrobe-button" class="wood-button" title="Wardrobe" aria-label="Open wardrobe"
    aria-expanded="false" aria-controls="wardrobe" hidden></button>
  <div id="wardrobe" role="dialog" aria-label="Wardrobe" hidden></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
