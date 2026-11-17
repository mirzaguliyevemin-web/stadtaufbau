# Epochia als Android-App

Capacitor verpackt das Spiel aus `neu/` und die Bilder aus `bilder/epochia/` (ohne `quelle/`) zu einer App.
Werkzeuge liegen ohne Installation mit Passwort in `~/Android` (Java 21 und Android-SDK).

Neue Test-App bauen und aufs angeschlossene Handy spielen (USB-Debugging an):

```bash
cd app
export JAVA_HOME=~/Android/jdk-21.0.13+9 ANDROID_HOME=~/Android/Sdk
npm run sync                                   # www/ neu zusammenstellen und ins Android-Projekt kopieren
cd android && ./gradlew assembleDebug
~/Android/Sdk/platform-tools/adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Ohne Kabel (Emin ist oft nicht am Laptop): die fertige App als GitHub-Release hochladen. Emin öffnet am Handy
https://github.com/mirzaguliyevemin-web/stadtaufbau/releases/latest/download/epochia.apk und tippt „Installieren“.

```bash
cp android/app/build/outputs/apk/debug/app-debug.apk /tmp/epochia.apk   # Name muss epochia.apk sein
gh release create app-vNNN /tmp/epochia.apk --title "Epochia App Version NNN" --notes "Test-App für Android." --latest
```

- Die Überinstallation klappt nur mit demselben Schlüssel: `~/.android/debug.keystore` auf diesem Laptop nie löschen,
  sonst muss die App erst deinstalliert werden (Spielstände in der App wären dann weg).
- Die App speichert getrennt vom Browser: Spielstände kommen über das Konto (Cloud-Abgleich) hinüber.
- In der App gibt es keinen Service Worker; Updates kommen mit einer neuen App.
- Vollbild: `android/app/src/main/java/de/epochia/spiel/MainActivity.java`.
- Für den Play Store fehlen noch: Signatur-Schlüssel, Datenschutzerklärung, Store-Bilder (erst mit Gewerbe).
