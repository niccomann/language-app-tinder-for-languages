package it.nicco.tinderforlanguages;

import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "OfflineBackend")
public class OfflineBackendPlugin extends Plugin {
    @PluginMethod
    public void request(PluginCall call) {
        String method = call.getString("method", "GET");
        String path = call.getString("path", "/");
        String body = call.getString("body");

        try {
            if (!Python.isStarted()) {
                Python.start(new AndroidPlatform(getContext()));
            }

            PyObject embeddedBackend = Python.getInstance().getModule("embedded_backend");
            String responseBody = embeddedBackend.callAttr("handle_request", method, path, body).toString();

            JSObject response = new JSObject();
            response.put("status", 200);
            response.put("body", responseBody);
            call.resolve(response);
        } catch (Exception exception) {
            call.reject("Offline backend request failed", exception);
        }
    }
}
