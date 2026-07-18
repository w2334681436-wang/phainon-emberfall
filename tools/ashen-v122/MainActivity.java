package com.wxy.ashenfrontier.stable;

import android.annotation.TargetApi;
import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String TAG = "AshenFrontier";
    private static final String ORIGIN = "https://appassets.local/";

    private FrameLayout root;
    private WebView webView;
    private TextView statusView;
    private int rendererRecoveryCount = 0;
    private boolean destroyed = false;
    private boolean gameReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            requestWindowFeature(Window.FEATURE_NO_TITLE);
            getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN
            );
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
            );
            hideSystemBars();
            createRoot();
            createWebView(savedInstanceState);
        } catch (Throwable error) {
            Log.e(TAG, "Native startup failure", error);
            showNativeError("应用启动失败\n" + error.getClass().getSimpleName());
        }
    }

    private void createRoot() {
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(7, 10, 9));
        setContentView(root);

        statusView = new TextView(this);
        statusView.setText("正在启动灰烬边境…");
        statusView.setTextColor(Color.rgb(226, 217, 194));
        statusView.setTextSize(16f);
        statusView.setGravity(Gravity.CENTER);
        statusView.setPadding(32, 32, 32, 32);
        root.addView(
            statusView,
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );
    }

    private void createWebView(Bundle savedState) {
        if (destroyed || root == null) return;

        destroyWebViewOnly();
        gameReady = false;

        WebView candidate = new WebView(this);
        candidate.setBackgroundColor(Color.rgb(7, 10, 9));
        candidate.setOverScrollMode(View.OVER_SCROLL_NEVER);
        candidate.setHorizontalScrollBarEnabled(false);
        candidate.setVerticalScrollBarEnabled(false);

        WebSettings settings = candidate.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(false);
        settings.setTextZoom(100);
        settings.setUserAgentString(
            settings.getUserAgentString() + " AshenFrontierAndroid/1.2.2"
        );

        WebView.setWebContentsDebuggingEnabled(false);
        candidate.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        candidate.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                Log.d(
                    TAG,
                    "JS " + message.messageLevel() + ": " +
                    message.message() + " @" + message.lineNumber()
                );
                return true;
            }
        });
        candidate.setWebViewClient(
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? new Api26AssetClient()
                : new AssetClient()
        );

        webView = candidate;
        root.addView(
            candidate,
            0,
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );

        if (savedState != null && candidate.restoreState(savedState) != null) {
            return;
        }

        candidate.post(() -> {
            if (!destroyed && webView == candidate) {
                candidate.loadUrl(ORIGIN + "index.html?safe=1");
            }
        });

        candidate.postDelayed(() -> {
            if (!destroyed && webView == candidate && !gameReady) {
                Log.e(TAG, "BOOT_TIMEOUT: web game did not report ready within 45 seconds");
                showNativeError(
                    "游戏启动超时，但应用已阻止闪退。\n" +
                    "请更新 Android System WebView 后重试。"
                );
            }
        }, 45000L);
    }

    private final class AndroidBridge {
        @JavascriptInterface
        public void ready() {
            runOnUiThread(() -> {
                if (destroyed) return;
                gameReady = true;
                Log.i(TAG, "ASHEN_READY_NATIVE");
                if (statusView != null) statusView.setVisibility(View.GONE);
            });
        }

        @JavascriptInterface
        public void bootError(String message) {
            final String safeMessage = message == null ? "未知网页错误" : message;
            runOnUiThread(() -> {
                Log.e(TAG, "WEB_BOOT_ERROR: " + safeMessage);
                showNativeError("网页游戏启动失败\n" + safeMessage);
            });
        }
    }

    private class AssetClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(
            WebView view,
            WebResourceRequest request
        ) {
            return serveLocalAsset(request.getUrl());
        }

        @SuppressWarnings("deprecation")
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
            return serveLocalAsset(Uri.parse(url));
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            Log.i(TAG, "PAGE_FINISHED: " + url);
            view.evaluateJavascript(
                "setTimeout(function(){" +
                "if(window.__ASHEN_READY__&&window.AndroidBridge){" +
                "window.AndroidBridge.ready();" +
                "}" +
                "},500);",
                null
            );
        }
    }

    @TargetApi(Build.VERSION_CODES.O)
    private final class Api26AssetClient extends AssetClient {
        @Override
        public boolean onRenderProcessGone(
            WebView view,
            RenderProcessGoneDetail detail
        ) {
            Log.e(
                TAG,
                "WEBVIEW_RENDERER_GONE crashed=" + detail.didCrash() +
                " priority=" + detail.rendererPriorityAtExit()
            );

            if (root != null && view != null) root.removeView(view);
            try {
                if (view != null) view.destroy();
            } catch (Throwable ignored) {
                // Ignore cleanup failures from an already-dead renderer.
            }
            if (view == webView) webView = null;

            if (!destroyed && rendererRecoveryCount < 1) {
                rendererRecoveryCount++;
                if (statusView != null) {
                    statusView.setText("图形进程已恢复，正在以最低画质重启…");
                    statusView.setVisibility(View.VISIBLE);
                }
                if (root != null) {
                    root.postDelayed(() -> createWebView(null), 900L);
                }
            } else {
                showNativeError(
                    "图形进程异常，但应用已阻止闪退。\n" +
                    "请更新 Android System WebView 后重试。"
                );
            }
            return true;
        }
    }

    private WebResourceResponse serveLocalAsset(Uri uri) {
        if (uri == null || !"appassets.local".equalsIgnoreCase(uri.getHost())) {
            return null;
        }

        String path = uri.getPath();
        if (path == null || path.isEmpty() || "/".equals(path)) {
            path = "/index.html";
        }
        while (path.startsWith("/")) path = path.substring(1);
        if (path.contains("..")) return notFound();

        try {
            InputStream stream = getAssets().open("game/" + path);
            return new WebResourceResponse(mimeFor(path), "UTF-8", stream);
        } catch (IOException error) {
            Log.w(TAG, "Missing local asset: game/" + path);
            return notFound();
        }
    }

    private static WebResourceResponse notFound() {
        return new WebResourceResponse(
            "text/plain",
            "UTF-8",
            new ByteArrayInputStream(
                "Not Found".getBytes(StandardCharsets.UTF_8)
            )
        );
    }

    private static String mimeFor(String path) {
        String lower = path.toLowerCase(Locale.US);
        if (lower.endsWith(".html")) return "text/html";
        if (lower.endsWith(".js") || lower.endsWith(".mjs")) {
            return "text/javascript";
        }
        if (lower.endsWith(".css")) return "text/css";
        if (lower.endsWith(".json")) return "application/json";
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            return "image/jpeg";
        }
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        if (lower.endsWith(".mp3")) return "audio/mpeg";
        if (lower.endsWith(".ogg")) return "audio/ogg";
        if (lower.endsWith(".wasm")) return "application/wasm";
        return "application/octet-stream";
    }

    private void showNativeError(String message) {
        if (destroyed) return;

        if (root == null) {
            root = new FrameLayout(this);
            root.setBackgroundColor(Color.rgb(7, 10, 9));
            setContentView(root);
        }

        destroyWebViewOnly();

        if (statusView == null) {
            statusView = new TextView(this);
            statusView.setTextColor(Color.rgb(238, 226, 201));
            statusView.setTextSize(16f);
            statusView.setGravity(Gravity.CENTER);
            statusView.setPadding(40, 40, 40, 40);
            root.addView(
                statusView,
                new FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            );
        }
        statusView.setText(message);
        statusView.setVisibility(View.VISIBLE);
    }

    private void destroyWebViewOnly() {
        WebView current = webView;
        if (current == null) return;
        webView = null;

        try {
            if (root != null) root.removeView(current);
            current.stopLoading();
            current.loadUrl("about:blank");
            current.removeJavascriptInterface("AndroidBridge");
            current.removeAllViews();
            current.destroy();
        } catch (Throwable error) {
            Log.w(TAG, "WebView cleanup failed", error);
        }
    }

    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    @Override
    public void onBackPressed() {
        WebView current = webView;
        if (current == null) {
            moveTaskToBack(true);
            return;
        }
        current.evaluateJavascript(
            "Boolean(window.__ashenHandleBack&&window.__ashenHandleBack())",
            value -> {
                WebView latest = webView;
                if (!"true".equals(value)) {
                    if (latest != null && latest.canGoBack()) latest.goBack();
                    else moveTaskToBack(true);
                }
            }
        );
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        hideSystemBars();
    }

    @Override
    protected void onDestroy() {
        destroyed = true;
        destroyWebViewOnly();
        super.onDestroy();
    }
}
