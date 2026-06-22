package com.fontloader

import android.graphics.Typeface
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.views.text.ReactFontManager
import java.io.File
import java.io.FileOutputStream
import java.io.RandomAccessFile
import java.nio.ByteBuffer
import java.nio.ByteOrder

@ReactModule(name = FontLoaderModule.NAME)
class FontLoaderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "FontLoader"
        private val loadedFonts = mutableMapOf<String, String>()
    }

    override fun getName(): String = NAME

    override fun invalidate() {
        loadedFonts.clear()
        super.invalidate()
    }

    // =========================================================================
    // Synchronous methods
    // =========================================================================

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun isFontLoaded(fontName: String): Boolean {
        return loadedFonts.containsKey(fontName)
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun getLoadedFonts(): WritableArray {
        val array = WritableNativeArray()
        loadedFonts.keys.forEach { array.pushString(it) }
        return array
    }

    // =========================================================================
    // Async methods
    // =========================================================================

    @ReactMethod
    fun loadFontFromBase64(name: String, base64Data: String, type: String, promise: Promise) {
        try {
            // Check if already loaded
            if (loadedFonts.containsKey(name)) {
                promise.resolve(createResult(name, loadedFonts[name] ?: name, true))
                return
            }

            val decodedBytes = Base64.decode(base64Data, Base64.DEFAULT)
            val fontFile = writeFontToCache(name, decodedBytes, type)
            val typeface = Typeface.createFromFile(fontFile)
            val familyName = extractFontFamilyName(fontFile) ?: name

            registerTypeface(name, typeface)
            loadedFonts[name] = familyName

            promise.resolve(createResult(name, familyName, true))
        } catch (e: Exception) {
            promise.reject("ERR_FONT_LOAD", "Failed to load font '$name': ${e.message}", e)
        }
    }

    @ReactMethod
    fun loadFontFromFile(name: String, filePath: String, promise: Promise) {
        try {
            // Check if already loaded
            if (loadedFonts.containsKey(name)) {
                promise.resolve(createResult(name, loadedFonts[name] ?: name, true))
                return
            }

            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("ERR_FILE_NOT_FOUND", "Font file not found: $filePath")
                return
            }

            val typeface = Typeface.createFromFile(file)
            val familyName = extractFontFamilyName(file) ?: name

            // Also copy to our cache dir for management
            val cacheFile = writeFontToCache(name, file.readBytes(), filePath.substringAfterLast('.'))
            registerTypeface(name, typeface)
            loadedFonts[name] = familyName

            promise.resolve(createResult(name, familyName, true))
        } catch (e: Exception) {
            promise.reject("ERR_FONT_LOAD", "Failed to load font from file: ${e.message}", e)
        }
    }

    @ReactMethod
    fun loadFontFromUrl(name: String, urlString: String, promise: Promise) {
        Thread {
            try {
                if (loadedFonts.containsKey(name)) {
                    promise.resolve(createResult(name, loadedFonts[name] ?: name, true))
                    return@Thread
                }

                val url = java.net.URL(urlString)
                val connection = url.openConnection()
                connection.connectTimeout = 30000
                connection.readTimeout = 30000

                val ext = urlString.substringAfterLast('.', "ttf").substringBefore('?')
                val cacheFile = File(getFontCacheDir(), "$name.$ext")

                connection.getInputStream().use { input ->
                    FileOutputStream(cacheFile).use { output ->
                        input.copyTo(output)
                    }
                }

                val typeface = Typeface.createFromFile(cacheFile)
                val familyName = extractFontFamilyName(cacheFile) ?: name

                registerTypeface(name, typeface)
                loadedFonts[name] = familyName

                promise.resolve(createResult(name, familyName, true))
            } catch (e: Exception) {
                promise.reject("ERR_URL_DOWNLOAD", "Failed to download/load font from URL: ${e.message}", e)
            }
        }.start()
    }

    @ReactMethod
    fun unloadFont(name: String, promise: Promise) {
        try {
            loadedFonts.remove(name)
            // Remove cached file
            val cacheDir = getFontCacheDir()
            cacheDir.listFiles()?.filter {
                it.nameWithoutExtension == name
            }?.forEach { it.delete() }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_UNLOAD", "Failed to unload font '$name': ${e.message}", e)
        }
    }

    @ReactMethod
    fun clearCache(promise: Promise) {
        try {
            val cacheDir = getFontCacheDir()
            cacheDir.listFiles()?.forEach { it.delete() }
            loadedFonts.clear()
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("ERR_CLEAR_CACHE", "Failed to clear font cache: ${e.message}", e)
        }
    }

    @ReactMethod
    fun getFontInfo(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (!file.exists()) {
                promise.reject("ERR_FILE_NOT_FOUND", "Font file not found: $filePath")
                return
            }

            val info = parseFontInfo(file)
            promise.resolve(info)
        } catch (e: Exception) {
            promise.reject("ERR_FONT_INFO", "Failed to get font info: ${e.message}", e)
        }
    }

    // =========================================================================
    // Internal helpers
    // =========================================================================

    private fun getFontCacheDir(): File {
        val dir = File(reactContext.cacheDir, "rn_font_loader")
        if (!dir.exists()) dir.mkdirs()
        return dir
    }

    private fun writeFontToCache(name: String, data: ByteArray, type: String): File {
        val cacheDir = getFontCacheDir()
        val ext = if (type.lowercase() == "otf") "otf" else "ttf"
        val file = File(cacheDir, "$name.$ext")
        FileOutputStream(file).use { it.write(data) }
        return file
    }

    private fun registerTypeface(fontName: String, typeface: Typeface) {
        try {
            ReactFontManager.getInstance().setTypeface(fontName, Typeface.NORMAL, typeface)
            ReactFontManager.getInstance().setTypeface(fontName, Typeface.BOLD, typeface)
            ReactFontManager.getInstance().setTypeface(fontName, Typeface.ITALIC, typeface)
            ReactFontManager.getInstance().setTypeface(fontName, Typeface.BOLD_ITALIC, typeface)
        } catch (e: Exception) {
            // Fallback: use reflection for older RN versions
            try {
                val field = ReactFontManager::class.java.getDeclaredField("mCustomTypefaceCache")
                field.isAccessible = true
                @Suppress("UNCHECKED_CAST")
                val cache = field.get(ReactFontManager.getInstance()) as MutableMap<String, Typeface>
                cache[fontName] = typeface
            } catch (_: Exception) {
                // If reflection also fails, throw original error
                throw e
            }
        }
    }

    private fun createResult(name: String, familyName: String, loaded: Boolean): WritableMap {
        val result = WritableNativeMap()
        result.putString("name", name)
        result.putString("familyName", familyName)
        result.putBoolean("loaded", loaded)
        return result
    }

    // =========================================================================
    // TTF/OTF name table parser — extracts font metadata
    // =========================================================================

    private fun extractFontFamilyName(file: File): String? {
        return try {
            val info = parseFontInfo(file)
            info.getString("familyName")
        } catch (_: Exception) {
            null
        }
    }

    private fun parseFontInfo(file: File): WritableMap {
        val result = WritableNativeMap()
        val raf = RandomAccessFile(file, "r")

        try {
            // Read the offset table
            val sfVersion = raf.readInt()
            val numTables = raf.readUnsignedShort()
            raf.skipBytes(6) // searchRange, entrySelector, rangeShift

            // Find the 'name' table
            var nameTableOffset = 0L
            var nameTableLength = 0

            for (i in 0 until numTables) {
                val tag = ByteArray(4)
                raf.readFully(tag)
                val tagStr = String(tag)
                raf.skipBytes(4) // checkSum
                val offset = raf.readInt().toLong() and 0xFFFFFFFFL
                val length = raf.readInt()

                if (tagStr == "name") {
                    nameTableOffset = offset
                    nameTableLength = length
                    break
                }
            }

            if (nameTableOffset == 0L) {
                result.putString("familyName", "")
                result.putString("postScriptName", "")
                result.putString("style", "")
                result.putInt("weight", 400)
                return result
            }

            // Read the name table
            raf.seek(nameTableOffset)
            val nameTableData = ByteArray(nameTableLength)
            raf.readFully(nameTableData)
            val buffer = ByteBuffer.wrap(nameTableData).order(ByteOrder.BIG_ENDIAN)

            val format = buffer.short.toInt()
            val count = buffer.short.toInt() and 0xFFFF
            val stringOffset = buffer.short.toInt() and 0xFFFF

            var familyName = ""
            var subFamily = ""
            var postScriptName = ""
            var fullName = ""

            for (i in 0 until count) {
                val platformID = buffer.short.toInt() and 0xFFFF
                val encodingID = buffer.short.toInt() and 0xFFFF
                val languageID = buffer.short.toInt() and 0xFFFF
                val nameID = buffer.short.toInt() and 0xFFFF
                val length = buffer.short.toInt() and 0xFFFF
                val offset = buffer.short.toInt() and 0xFFFF

                // Only read platform 3 (Windows) or platform 1 (Mac)
                if (nameID in listOf(1, 2, 4, 6)) {
                    val strBytes = ByteArray(length)
                    System.arraycopy(nameTableData, stringOffset + offset, strBytes, 0, length)

                    val str = if (platformID == 3 || platformID == 0) {
                        // UTF-16 BE
                        String(strBytes, Charsets.UTF_16BE)
                    } else {
                        // Mac Roman
                        String(strBytes, Charsets.ISO_8859_1)
                    }

                    when (nameID) {
                        1 -> if (familyName.isEmpty()) familyName = str
                        2 -> if (subFamily.isEmpty()) subFamily = str
                        4 -> if (fullName.isEmpty()) fullName = str
                        6 -> if (postScriptName.isEmpty()) postScriptName = str
                    }
                }
            }

            // Determine weight from subfamily
            val weight = when {
                subFamily.contains("Thin", ignoreCase = true) -> 100
                subFamily.contains("ExtraLight", ignoreCase = true) ||
                    subFamily.contains("UltraLight", ignoreCase = true) -> 200
                subFamily.contains("Light", ignoreCase = true) -> 300
                subFamily.contains("Medium", ignoreCase = true) -> 500
                subFamily.contains("SemiBold", ignoreCase = true) ||
                    subFamily.contains("DemiBold", ignoreCase = true) -> 600
                subFamily.contains("ExtraBold", ignoreCase = true) ||
                    subFamily.contains("UltraBold", ignoreCase = true) -> 800
                subFamily.contains("Bold", ignoreCase = true) -> 700
                subFamily.contains("Black", ignoreCase = true) ||
                    subFamily.contains("Heavy", ignoreCase = true) -> 900
                else -> 400
            }

            result.putString("familyName", familyName)
            result.putString("fullName", fullName)
            result.putString("postScriptName", postScriptName)
            result.putString("style", subFamily.ifEmpty { "Regular" })
            result.putInt("weight", weight)
        } finally {
            raf.close()
        }

        return result
    }
}
