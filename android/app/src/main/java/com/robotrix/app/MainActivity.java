package com.robotrix.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.gms.tasks.Task;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "RobotrixAppUpdate";
    private static final int IMMEDIATE_UPDATE_REQUEST_CODE = 9001;
    private AppUpdateManager appUpdateManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        appUpdateManager = AppUpdateManagerFactory.create(this);
        checkForUpdate();
    }

    @Override
    public void onResume() {
        super.onResume();
        if (appUpdateManager != null) {
            appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
                if (appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                    try {
                        appUpdateManager.startUpdateFlowForResult(
                            appUpdateInfo,
                            this,
                            AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
                            IMMEDIATE_UPDATE_REQUEST_CODE
                        );
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to resume immediate update flow", e);
                    }
                }
            });
        }
    }

    private void checkForUpdate() {
        if (appUpdateManager == null) return;

        Task<AppUpdateInfo> appUpdateInfoTask = appUpdateManager.getAppUpdateInfo();
        appUpdateInfoTask.addOnSuccessListener(appUpdateInfo -> {
            if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                    && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                try {
                    appUpdateManager.startUpdateFlowForResult(
                        appUpdateInfo,
                        this,
                        AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
                        IMMEDIATE_UPDATE_REQUEST_CODE
                    );
                } catch (Exception e) {
                    Log.e(TAG, "Failed to start immediate update flow", e);
                }
            } else {
                Log.d(TAG, "No immediate update available or not allowed. Availability code: " + appUpdateInfo.updateAvailability());
            }
        }).addOnFailureListener(e -> {
            Log.w(TAG, "In-App update check failed (normal if not downloaded via Google Play): " + e.getMessage());
        });
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == IMMEDIATE_UPDATE_REQUEST_CODE) {
            if (resultCode != RESULT_OK) {
                Log.w(TAG, "Immediate update cancelled or failed. Result code: " + resultCode);
                // For critical immediate update, prompt again
                checkForUpdate();
            }
        }
    }
}
