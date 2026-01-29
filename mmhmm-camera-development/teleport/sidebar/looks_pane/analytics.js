//
//  sidebar/looks_pane/analytics.js
//  mmhmm
//
//  Created by Seth Hitchings on 4/22/2025.
//  Copyright 2025 mmhmm inc. All rights reserved.
//

class LooksAnalytics {

    static onLookCreated(id, presetId = null) {
        const props = { look_id: id };
        if (presetId) {
            props.preset_id = presetId;
        }
        Analytics.Log("look.created", props);
    }

    static onDemoLookImported(id, exportId, presetId = null) {
        const props = {
            look_id: id,
            exportId
        };
        if (presetId) {
            props.preset_id = presetId;
        }
        Analytics.Log("look.demo.import", props);
    }

    static onDemoCameraPermissionDenied() {
        Analytics.Log("look.demo.camera_permission.denied");
    }

    static onDemoCameraPermissionGranted() {
        Analytics.Log("look.demo.camera_permission.granted");
    }

    static onDemoExperimentStarted(experimentName, variant) {
        // Save these as super properties to be used on all subsequent events
        Analytics.AuxiliaryProps.experiment_name = experimentName;
        Analytics.AuxiliaryProps.experiment_variant = variant;

        Analytics.Log("look.demo.experiment.started");
    }

    static onDemoLookSaved(exportId, presetId=null, variantId=null) {
        const props = {exportId};
        if (presetId) {
            props.preset_id = presetId;
        }
        if (variantId) {
            props.variant_id = variantId;
        }
        Analytics.Log("look.demo.save", props);
    }

    static onDemoLookShared(id, exportId) {
        Analytics.Log("look.demo.share", {
            look_id: id,
            exportId
        });
    }

    static onLookPresetClicked(id, variantId = null) {
        const props = { id };
        if (variantId) {
            props.variant_id = variantId;
        }
        Analytics.Log("look.preset.clicked", props);
    }

    static onShowPresetsList() {
        Analytics.Log("look.editor.list_presets");
    }

    static onLookClicked(id, exportId = null, presetId = null) {
        const props = { look_id: id };
        if (exportId) {
            props.share_id = exportId;
        }
        if (presetId) {
            props.preset_id = presetId;
        }
        Analytics.Log("application.look_changed", props);
    }

    static onReactionCreated(id, style) {
        Analytics.Log("visual.created", {
            visual_id: id,
            style
        });
    }

    static onReactionClicked(id, exportId) {
        const props = { visual_id: id };
        if (exportId) {
            props.share_id = exportId;
        }
        Analytics.Log("application.visual_changed", props);
    }

    static onAddBrand(lookId) {
        Analytics.Log("button.click", {
            look_id: lookId,
            action: "add brand"
        });
    }

    static onChangeBrand(lookId) {
        Analytics.Log("button.click", {
            look_id: lookId,
            action: "change brand"
        });
    }

    static onApplyBrandToLook(lookId, domain) {
        Analytics.Log("look.editor.apply_brand", {
            look_id: lookId,
            domain
        });
    }

    static onSkipBrandSearch(lookId) {
        Analytics.Log("look.editor.skip_apply_brand", { look_id: lookId });
    }

    static onEditLook(id, presetId = null, variantId = null) {
        const props = { look_id: id };
        if (presetId) {
            props.preset_id = presetId;
        }
        if (variantId) {
            props.variant_id = variantId;
        }
        Analytics.Log("look.editor.opened", props);
    }

    static onSaveLookChanges(id) {
        Analytics.Log("look.editor.saved", { look_id: id });
    }

    static onDiscardLookChanges(id) {
        Analytics.Log("look.editor.cancelled", { look_id: id });
    }

    static onEditReaction(id) {
        Analytics.Log("visual.editor.opened", { visual_id: id });
    }

    static onLookDeleted(id) {
        Analytics.Log("look.deleted", { look_id: id });
    }

    static onReactionDeleted(id) {
        Analytics.Log("visual.deleted", { visual_id: id });
    }

    static onLookDuplicated(id, duplicateId) {
        Analytics.Log("look.duplicated", {
            look_id: id,
            duplicate_id: duplicateId
        });
    }

    static onReactionDuplicated(id, duplicateId) {
        Analytics.Log("visual.duplicated", {
            visual_id: id,
            duplicate_id: duplicateId,
        });
    }

    static onLookReverted(id, catalogId) {
        Analytics.Log("look.reverted", {
            look_id: id,
            catalog_id: catalogId,
        });
    }

    static onReactionReverted(id, catalogId) {
        Analytics.Log("visual.reverted", {
            visual_id: id,
            catalog_id: catalogId,
        });
    }

    static onItemPinned(id, type) {
        const prefix = LooksAnalytics.prefixForType(type);
        if (prefix) {
            Analytics.Log(`${prefix}.pinned`, LooksAnalytics.propertiesForType(type, id));
        }
    }

    static onItemUnpinned(id, type) {
        const prefix = LooksAnalytics.prefixForType(type);
        if (prefix) {
            Analytics.Log(`${prefix}.unpinned`, LooksAnalytics.propertiesForType(type, id));
        }
    }

    static onToggleLooks(enabled, look) {
        Analytics.Log("application.toggle_looks", {
            state: enabled ? "on" : "off",
            look_id: look?.identifier
        });
    }

    static onToggleAway(enabled, awayScreen = null) {
        Analytics.Log("application.toggle_away", {
            state: enabled ? "on" : "off",
            away_screen: awayScreen?.metadata?.catalogAwayScreenId,
        });
    }

    static onToggleFilters(enabled) {
        Analytics.Log("application.toggle_filters", {
            state: enabled ? "on" : "off"
        });
    }

    static onToggleNametag(look, enabled) {
        Analytics.Log("application.toggle_name_tag_visibility", {
            state: enabled ? "on" : "off",
            look_id: look?.identifier,
         });
    }

    static onEditNametag(look) {
        Analytics.Log("application.edit_name_tag", {
            look_id: look?.identifier,
        });
    }

    static onCatalogOpened(type) {
        const prefix = LooksAnalytics.prefixForType(type);
        if (prefix) {
            Analytics.Log(`${prefix}.catalog.opened`);
        }
    }

    static onCatalogClosed(type) {
        const prefix = LooksAnalytics.prefixForType(type);
        if (prefix) {
            Analytics.Log(`${prefix}.catalog.closed`);
        }
    }

    static onCatalogItemImported(type, records) {
        const prefix = LooksAnalytics.prefixForType(type);
        if (prefix) {
            const page = records.find((r) => r.collection == mmhmmAPI.CloudyCollectionTypes.ModernSlide);
            if (page) {
                const props = {
                    catalog_id: page.exportId
                };
                const idKey = `${prefix}_id`;
                props[idKey] = page.id;
                Analytics.Log(`${prefix}.created`, props);
            }
        }
    }

    static onShowCameraMenu() {
        Analytics.Log("application.camera_menu.opened");
    }

    static onMuteCamera() {
        Analytics.Log("application.camera_menu.toggle_camera", {
            state: "off"
        });
    }

    static onUnmuteCamera() {
        Analytics.Log("application.camera_menu.toggle_camera", {
            state: "on"
        });
    }

    static onOpenLookEditorLayerOptions(lookId, type) {
        Analytics.Log("look.editor.layer.show_options", {
            look_id: lookId,
            type
        });
    }

    static onSearchLookLayer(lookId, type) {
        Analytics.Log("look.editor.layer.search", {
            look_id: lookId,
            type
        });
    }

    static onChangeLookLayer(lookId, type, id=null) {
        const props = {
            look_id: lookId,
            type
        };
        if (id) {
            props.media_id = id;
        }
        Analytics.Log("look.editor.layer.changed", props);
    }

    static onRemoveLookLayer(lookId, type) {
        Analytics.Log("look.editor.layer.removed", {
            look_id: lookId,
            type
        });
    }

    static onUploadLookLayer(lookId, type) {
        Analytics.Log("look.editor.layer.uploaded", {
            look_id: lookId,
            type
        });
    }

    static onChangeLookBackgroundStyle(lookId, style) {
        Analytics.Log("look.editor.background_style.changed", {
            look_id: lookId,
            style
        });
    }

    static onChangeLookShape(lookId, shape) {
        Analytics.Log("look.editor.shape.changed", {
            look_id: lookId,
            shape
        });
    }

    static onVirtualCameraConnected(look, nametagVisible) {
        const props = {
            look_id: look?.identifier,
            nametag_visible: nametagVisible,
        };
        if (look?.exportId) {
            props.share_id = look.exportId;
        }
        if (look?.getPresetId()) {
            props.preset_id = look.getPresetId();
        }
        Analytics.Log("application.virtual_camera.connected", props);
    }


    /* Helpers */

    static prefixForType(type) {
        if (type == "look" || type == LooksContentType.Look) {
            return "look";
        } else if (type == "reaction" || type == LooksContentType.Reaction) {
            return "visual";
        }
        return null;
    }

    static propertiesForType(type, id) {
        const properties = {};
        const prefix = LooksAnalytics.prefixForType(type);
        if (prefix) {
            properties[`${prefix}_id`] = id;
        }
        return properties;
    }


}
