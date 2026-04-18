

import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { Alert, Linking, Platform } from 'react-native';


const getPermissionText = (blocked: boolean) => (
    blocked ?
        Platform.OS == "ios" ?
            "Please enable microphone access in your device settings."
            : "Please grant microphone permission to the app." :
        "Microphone permission is required to use this feature."
)

export const checkRecordingPermission = async (): Promise<boolean> => {
    const status = await getRecordingPermissionsAsync()

    if (status.granted === true) {
        return true;
    }

    const blocked = !status.canAskAgain;

    Alert.alert(
        "Microphone Permission",
        getPermissionText(blocked),
        [
            {
                text: "Cancel",
                style: "cancel"
            },
            {
                text: blocked ? "Open Settings" : "Grant Permission",
                onPress: async () => {
                    if (blocked) {
                        await Linking.openSettings();
                    } else {
                        const { granted } = await requestRecordingPermissionsAsync();
                        if (!granted) {
                            Alert.alert("Permission Denied", "Microphone permission is required to use this feature.");
                        }
                    }
                }
            }
        ]
    );
    return false;
}



