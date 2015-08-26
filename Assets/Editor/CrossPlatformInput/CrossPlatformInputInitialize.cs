using System;
using System.Collections.Generic;
using UnityEditor;

namespace UnityStandardAssets.CrossPlatformInput.Inspector
{
    [InitializeOnLoad]
    public class CrossPlatformInitialize
    {
        // Custom compiler defines:
        //
        // CROSS_PLATFORM_INPUT : denotes that cross platform input package exists, so that other packages can use their CrossPlatformInput functions.
        // EDITOR_MOBILE_INPUT : denotes that mobile input should be used in editor, if a mobile build target is selected. (i.e. using Unity Remote app).
        // MOBILE_INPUT : denotes that mobile input should be used right now!

        static CrossPlatformInitialize()
        {
            var defines = GetDefinesList(buildTargetGroups[0]);
            if (!defines.Contains("CROSS_PLATFORM_INPUT"))
            {
                SetEnabled("CROSS_PLATFORM_INPUT", true, false);
                SetEnabled("MOBILE_INPUT", true, true);
            }
        }


        [MenuItem("Mobile Values/Enable")]
        private static void Enable()
        {
            SetEnabled("MOBILE_INPUT", true, true);
            switch (EditorUserBuildSettings.activeBuildTarget)
            {
                case BuildTarget.Android:
                case BuildTarget.iOS:
                case BuildTarget.WP8Player:
                case BuildTarget.BlackBerry:
				case BuildTarget.PSM: 
				case BuildTarget.Tizen: 
				case BuildTarget.WSAPlayer: 
                    EditorUtility.DisplayDialog("Mobile Values",
                                                "You have enabled Mobile Values. You'll need to use the Unity Remote app on a connected device to control your game in the Editor.",
                                                "OK");
                    break;

                default:
                    EditorUtility.DisplayDialog("Mobile Values",
                                                "You have enabled Mobile Values, but you have a non-mobile build target selected in your build settings. The mobile control rigs won't be active or visible on-screen until you switch the build target to a mobile platform.",
                                                "OK");
                    break;
            }
        }


        [MenuItem("Mobile Values/Enable", true)]
        private static bool EnableValidate()
        {
            var defines = GetDefinesList(mobileBuildTargetGroups[0]);
            return !defines.Contains("MOBILE_INPUT");
        }


        [MenuItem("Mobile Values/Disable")]
        private static void Disable()
        {
            SetEnabled("MOBILE_INPUT", false, true);
            switch (EditorUserBuildSettings.activeBuildTarget)
            {
                case BuildTarget.Android:
                case BuildTarget.iOS:
                case BuildTarget.WP8Player:
                case BuildTarget.BlackBerry:
                    EditorUtility.DisplayDialog("Mobile Values",
                                                "You have disabled Mobile Values. Mobile control rigs won't be visible, and the Cross Platform Values functions will always return standalone controls.",
                                                "OK");
                    break;
            }
        }


        [MenuItem("Mobile Values/Disable", true)]
        private static bool DisableValidate()
        {
            var defines = GetDefinesList(mobileBuildTargetGroups[0]);
            return defines.Contains("MOBILE_INPUT");
        }


        private static BuildTargetGroup[] buildTargetGroups = new BuildTargetGroup[]
            {
                BuildTargetGroup.Standalone,
                BuildTargetGroup.WebPlayer,
                BuildTargetGroup.Android,
                BuildTargetGroup.iOS,
                BuildTargetGroup.WP8,
                BuildTargetGroup.BlackBerry
            };

        private static BuildTargetGroup[] mobileBuildTargetGroups = new BuildTargetGroup[]
            {
                BuildTargetGroup.Android,
                BuildTargetGroup.iOS,
                BuildTargetGroup.WP8,
                BuildTargetGroup.BlackBerry,
				BuildTargetGroup.PSM, 
				BuildTargetGroup.Tizen, 
				BuildTargetGroup.WSA 
            };


        private static void SetEnabled(string defineName, bool enable, bool mobile)
        {
            //Debug.Log("setting "+defineName+" to "+enable);
            foreach (var group in mobile ? mobileBuildTargetGroups : buildTargetGroups)
            {
                var defines = GetDefinesList(group);
                if (enable)
                {
                    if (defines.Contains(defineName))
                    {
                        return;
                    }
                    defines.Add(defineName);
                }
                else
                {
                    if (!defines.Contains(defineName))
                    {
                        return;
                    }
                    while (defines.Contains(defineName))
                    {
                        defines.Remove(defineName);
                    }
                }
                string definesString = string.Join(";", defines.ToArray());
                PlayerSettings.SetScriptingDefineSymbolsForGroup(group, definesString);
            }
        }


        private static List<string> GetDefinesList(BuildTargetGroup group)
        {
            return new List<string>(PlayerSettings.GetScriptingDefineSymbolsForGroup(group).Split(';'));
        }
    }
}
