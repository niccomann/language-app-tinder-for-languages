package it.nicco.tinderforlanguages;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(OfflineBackendPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
