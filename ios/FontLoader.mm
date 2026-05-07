#import "FontLoader.h"
#import <CoreText/CoreText.h>
#import <CoreGraphics/CoreGraphics.h>
#import <React/RCTLog.h>

static NSMutableDictionary<NSString *, NSString *> *loadedFonts;

@implementation FontLoader

RCT_EXPORT_MODULE()

+ (void)initialize {
    if (self == [FontLoader class]) {
        loadedFonts = [NSMutableDictionary new];
    }
}

// =============================================================================
// Synchronous methods
// =============================================================================

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(isFontLoaded:(NSString *)fontName) {
    return @([loadedFonts objectForKey:fontName] != nil);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(getLoadedFonts) {
    return [loadedFonts allKeys];
}

// =============================================================================
// loadFontFromBase64
// =============================================================================

RCT_EXPORT_METHOD(loadFontFromBase64:(NSString *)name
                  base64Data:(NSString *)base64Data
                  type:(NSString *)type
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    // Check if already loaded
    if ([loadedFonts objectForKey:name]) {
        resolve(@{
            @"name": name,
            @"familyName": loadedFonts[name] ?: name,
            @"loaded": @YES
        });
        return;
    }

    NSData *fontData = [[NSData alloc] initWithBase64EncodedString:base64Data options:0];
    if (!fontData) {
        reject(@"ERR_FONT_LOAD", @"Invalid base64 data", nil);
        return;
    }

    [self registerFontWithData:fontData name:name resolve:resolve reject:reject];
}

// =============================================================================
// loadFontFromFile
// =============================================================================

RCT_EXPORT_METHOD(loadFontFromFile:(NSString *)name
                  filePath:(NSString *)filePath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    // Check if already loaded
    if ([loadedFonts objectForKey:name]) {
        resolve(@{
            @"name": name,
            @"familyName": loadedFonts[name] ?: name,
            @"loaded": @YES
        });
        return;
    }

    NSData *fontData = [NSData dataWithContentsOfFile:filePath];
    if (!fontData) {
        reject(@"ERR_FILE_NOT_FOUND", [NSString stringWithFormat:@"Font file not found: %@", filePath], nil);
        return;
    }

    // Also cache the font
    [self cacheFontData:fontData withName:name type:[filePath pathExtension]];

    [self registerFontWithData:fontData name:name resolve:resolve reject:reject];
}

// =============================================================================
// loadFontFromUrl
// =============================================================================

RCT_EXPORT_METHOD(loadFontFromUrl:(NSString *)name
                  urlString:(NSString *)urlString
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    if ([loadedFonts objectForKey:name]) {
        resolve(@{
            @"name": name,
            @"familyName": loadedFonts[name] ?: name,
            @"loaded": @YES
        });
        return;
    }

    NSURL *url = [NSURL URLWithString:urlString];
    if (!url) {
        reject(@"ERR_INVALID_URL", @"Invalid URL provided", nil);
        return;
    }

    NSURLSessionConfiguration *config = [NSURLSessionConfiguration ephemeralSessionConfiguration];
    config.timeoutIntervalForRequest = 30.0;
    NSURLSession *session = [NSURLSession sessionWithConfiguration:config];

    NSURLSessionDataTask *task = [session dataTaskWithURL:url completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        if (error || !data) {
            reject(@"ERR_URL_DOWNLOAD", [NSString stringWithFormat:@"Failed to download font: %@", error.localizedDescription], error);
            return;
        }

        NSString *ext = [url pathExtension];
        if (!ext || ext.length == 0) ext = @"ttf";

        // Cache the downloaded font
        [self cacheFontData:data withName:name type:ext];

        [self registerFontWithData:data name:name resolve:resolve reject:reject];
    }];

    [task resume];
}

// =============================================================================
// unloadFont
// =============================================================================

RCT_EXPORT_METHOD(unloadFont:(NSString *)name
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSString *postScriptName = loadedFonts[name];
    if (!postScriptName) {
        resolve(@(NO));
        return;
    }

    // Try to unregister the font
    CGFontRef fontRef = CGFontCreateWithFontName((__bridge CFStringRef)postScriptName);
    if (fontRef) {
        CFErrorRef error = NULL;
        BOOL success = CTFontManagerUnregisterGraphicsFont(fontRef, &error);
        CGFontRelease(fontRef);

        if (!success && error) {
            NSString *errorDesc = (__bridge_transfer NSString *)CFErrorCopyDescription(error);
            CFRelease(error);
            RCTLogWarn(@"FontLoader: Failed to unregister font '%@': %@", name, errorDesc);
        }
    }

    [loadedFonts removeObjectForKey:name];

    // Remove cached file
    [self removeCachedFont:name];

    resolve(@(YES));
}

// =============================================================================
// clearCache
// =============================================================================

RCT_EXPORT_METHOD(clearCache:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    // Unregister all fonts
    for (NSString *name in [loadedFonts allKeys]) {
        NSString *postScriptName = loadedFonts[name];
        CGFontRef fontRef = CGFontCreateWithFontName((__bridge CFStringRef)postScriptName);
        if (fontRef) {
            CFErrorRef error = NULL;
            CTFontManagerUnregisterGraphicsFont(fontRef, &error);
            CGFontRelease(fontRef);
            if (error) CFRelease(error);
        }
    }

    [loadedFonts removeAllObjects];

    // Clear cache directory
    NSString *cacheDir = [self fontCacheDirectory];
    NSFileManager *fm = [NSFileManager defaultManager];
    NSArray *files = [fm contentsOfDirectoryAtPath:cacheDir error:nil];
    for (NSString *file in files) {
        [fm removeItemAtPath:[cacheDir stringByAppendingPathComponent:file] error:nil];
    }

    resolve([NSNull null]);
}

// =============================================================================
// getFontInfo
// =============================================================================

RCT_EXPORT_METHOD(getFontInfo:(NSString *)filePath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    NSData *fontData = [NSData dataWithContentsOfFile:filePath];
    if (!fontData) {
        reject(@"ERR_FILE_NOT_FOUND", [NSString stringWithFormat:@"Font file not found: %@", filePath], nil);
        return;
    }

    CGDataProviderRef provider = CGDataProviderCreateWithCFData((__bridge CFDataRef)fontData);
    CGFontRef cgFont = CGFontCreateWithDataProvider(provider);
    CGDataProviderRelease(provider);

    if (!cgFont) {
        reject(@"ERR_FONT_INFO", @"Failed to parse font file", nil);
        return;
    }

    CTFontRef ctFont = CTFontCreateWithGraphicsFont(cgFont, 12.0, NULL, NULL);

    NSString *postScriptName = (__bridge_transfer NSString *)CTFontCopyPostScriptName(ctFont);
    NSString *familyName = (__bridge_transfer NSString *)CTFontCopyFamilyName(ctFont);
    NSString *fullName = (__bridge_transfer NSString *)CTFontCopyFullName(ctFont);
    NSString *displayName = (__bridge_transfer NSString *)CTFontCopyDisplayName(ctFont);

    // Get traits for weight and style info
    CTFontSymbolicTraits traits = CTFontGetSymbolicTraits(ctFont);
    NSDictionary *traitDict = (__bridge_transfer NSDictionary *)CTFontCopyTraits(ctFont);

    NSNumber *weightVal = traitDict[(__bridge NSString *)kCTFontWeightTrait];
    CGFloat weightTrait = weightVal ? [weightVal doubleValue] : 0.0;

    // Convert CoreText weight trait (-1.0 to 1.0) to CSS weight (100-900)
    int cssWeight = 400;
    if (weightTrait <= -0.7) cssWeight = 100;
    else if (weightTrait <= -0.5) cssWeight = 200;
    else if (weightTrait <= -0.23) cssWeight = 300;
    else if (weightTrait <= 0.1) cssWeight = 400;
    else if (weightTrait <= 0.23) cssWeight = 500;
    else if (weightTrait <= 0.33) cssWeight = 600;
    else if (weightTrait <= 0.5) cssWeight = 700;
    else if (weightTrait <= 0.7) cssWeight = 800;
    else cssWeight = 900;

    BOOL isBold = (traits & kCTFontTraitBold) != 0;
    BOOL isItalic = (traits & kCTFontTraitItalic) != 0;

    NSString *style = @"Regular";
    if (isBold && isItalic) style = @"Bold Italic";
    else if (isBold) style = @"Bold";
    else if (isItalic) style = @"Italic";

    CFRelease(ctFont);
    CGFontRelease(cgFont);

    resolve(@{
        @"familyName": familyName ?: @"",
        @"fullName": fullName ?: @"",
        @"postScriptName": postScriptName ?: @"",
        @"displayName": displayName ?: @"",
        @"style": style,
        @"weight": @(cssWeight),
    });
}

// =============================================================================
// Internal helpers
// =============================================================================

- (void)registerFontWithData:(NSData *)fontData
                        name:(NSString *)name
                     resolve:(RCTPromiseResolveBlock)resolve
                      reject:(RCTPromiseRejectBlock)reject
{
    CGDataProviderRef provider = CGDataProviderCreateWithCFData((__bridge CFDataRef)fontData);
    CGFontRef cgFont = CGFontCreateWithDataProvider(provider);
    CGDataProviderRelease(provider);

    if (!cgFont) {
        reject(@"ERR_FONT_LOAD", @"Failed to create font from data", nil);
        return;
    }

    CFErrorRef error = NULL;
    if (!CTFontManagerRegisterGraphicsFont(cgFont, &error)) {
        if (error) {
            CFStringRef errorDesc = CFErrorCopyDescription(error);
            NSString *errorMessage = (__bridge_transfer NSString *)errorDesc;
            CFRelease(error);

            // Check if already registered — treat as success
            if ([errorMessage containsString:@"already registered"]) {
                // Get the PostScript name
                CTFontRef ctFont = CTFontCreateWithGraphicsFont(cgFont, 0, NULL, NULL);
                NSString *postScriptName = (__bridge_transfer NSString *)CTFontCopyPostScriptName(ctFont);
                NSString *familyName = (__bridge_transfer NSString *)CTFontCopyFamilyName(ctFont);
                CFRelease(ctFont);
                CGFontRelease(cgFont);

                loadedFonts[name] = postScriptName ?: name;

                resolve(@{
                    @"name": postScriptName ?: name,
                    @"familyName": familyName ?: name,
                    @"loaded": @YES
                });
                return;
            }

            CGFontRelease(cgFont);
            reject(@"ERR_FONT_REGISTER", errorMessage, nil);
            return;
        }
    }

    // Get actual font names from the font file
    CTFontRef ctFont = CTFontCreateWithGraphicsFont(cgFont, 0, NULL, NULL);
    NSString *postScriptName = (__bridge_transfer NSString *)CTFontCopyPostScriptName(ctFont);
    NSString *familyName = (__bridge_transfer NSString *)CTFontCopyFamilyName(ctFont);
    CFRelease(ctFont);
    CGFontRelease(cgFont);

    // Store in our registry
    loadedFonts[name] = postScriptName ?: name;

    resolve(@{
        @"name": postScriptName ?: name,
        @"familyName": familyName ?: name,
        @"loaded": @YES
    });
}

- (NSString *)fontCacheDirectory {
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES);
    NSString *cacheDir = [paths.firstObject stringByAppendingPathComponent:@"rn_font_loader"];

    NSFileManager *fm = [NSFileManager defaultManager];
    if (![fm fileExistsAtPath:cacheDir]) {
        [fm createDirectoryAtPath:cacheDir withIntermediateDirectories:YES attributes:nil error:nil];
    }

    return cacheDir;
}

- (void)cacheFontData:(NSData *)data withName:(NSString *)name type:(NSString *)type {
    NSString *ext = [type.lowercaseString isEqualToString:@"otf"] ? @"otf" : @"ttf";
    NSString *filePath = [[self fontCacheDirectory] stringByAppendingPathComponent:
                          [NSString stringWithFormat:@"%@.%@", name, ext]];
    [data writeToFile:filePath atomically:YES];
}

- (void)removeCachedFont:(NSString *)name {
    NSString *cacheDir = [self fontCacheDirectory];
    NSFileManager *fm = [NSFileManager defaultManager];
    NSArray *extensions = @[@"ttf", @"otf"];

    for (NSString *ext in extensions) {
        NSString *path = [cacheDir stringByAppendingPathComponent:
                          [NSString stringWithFormat:@"%@.%@", name, ext]];
        if ([fm fileExistsAtPath:path]) {
            [fm removeItemAtPath:path error:nil];
        }
    }
}

@end
