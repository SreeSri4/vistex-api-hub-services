import type {
  FileTemplateSpec,
  FileTemplateSection,
  FileTemplateMapping,
  FileTemplateField,
  FileTemplateDiffResult,
  SectionDiff,
  MappingDiff,
  FieldChange,
} from "../types/tenant";

const MAPPING_TYPE_LABELS: Record<string, string> = {
  I: "Import",
  E: "Export",
};
const MAPPING_TYPE_DEFAULT = "Import & Export";

const CONVERSIONS_LABELS: Record<string, string> = {
  V: "Skip Value Checks",
  X: "Skip Conversions",
  Y: "Skip Value Checks & Conversions",
};
const CONVERSIONS_DEFAULT = "All Checks";

function labelMappingType(code?: string): string {
  const trimmed = (code ?? "").trim();
  return trimmed ? MAPPING_TYPE_LABELS[trimmed.toUpperCase()] ?? MAPPING_TYPE_DEFAULT : MAPPING_TYPE_DEFAULT;
}

function labelConversions(code?: string): string {
  const trimmed = (code ?? "").trim();
  return trimmed ? CONVERSIONS_LABELS[trimmed.toUpperCase()] ?? CONVERSIONS_DEFAULT : CONVERSIONS_DEFAULT;
}

/**
 * Compare two sections arrays and return the differences.
 */
function compareSections(
  sections1: FileTemplateSection[] | undefined,
  sections2: FileTemplateSection[] | undefined
): SectionDiff[] {
  const s1 = sections1 ?? [];
  const s2 = sections2 ?? [];
  const diffs: SectionDiff[] = [];

  const map1 = new Map(s1.map((s) => [s.name, s]));
  const map2 = new Map(s2.map((s) => [s.name, s]));

  // Check for removed sections
  for (const [name] of map1) {
    if (!map2.has(name)) {
      diffs.push({ name, removed: true });
    }
  }

  // Check for added sections
  for (const [name] of map2) {
    if (!map1.has(name)) {
      diffs.push({ name, added: true });
    }
  }

  // Check for modified sections
  for (const [name, section2] of map2) {
    const section1 = map1.get(name);
    if (section1) {
      const changes: Record<string, FieldChange> = {};

      if (section1.description !== section2.description) {
        changes.description = { old: section1.description, new: section2.description };
      }
      if (section1.apiName !== section2.apiName) {
        changes.apiName = { old: section1.apiName, new: section2.apiName };
      }
      if (section1.parentSection !== section2.parentSection) {
        changes.parentSection = { old: section1.parentSection, new: section2.parentSection };
      }

      if (Object.keys(changes).length > 0) {
        diffs.push({ name, changed: true, changes });
      }
    }
  }

  return diffs;
}

/**
 * Compare two mappings arrays and return the differences.
 * Keyed by sectionName + fieldName.
 */
function compareMappings(
  mappings1: FileTemplateMapping[] | undefined,
  mappings2: FileTemplateMapping[] | undefined
): MappingDiff[] {
  const m1 = mappings1 ?? [];
  const m2 = mappings2 ?? [];
  const diffs: MappingDiff[] = [];

  const map1 = new Map(m1.map((m) => [`${m.sectionName}::${m.fieldName}`, m]));
  const map2 = new Map(m2.map((m) => [`${m.sectionName}::${m.fieldName}`, m]));

  // Check for removed mappings
  for (const [key, mapping] of map1) {
    if (!map2.has(key)) {
      diffs.push({ sectionName: mapping.sectionName, fieldName: mapping.fieldName, removed: true });
    }
  }

  // Check for added mappings
  for (const [key, mapping] of map2) {
    if (!map1.has(key)) {
      diffs.push({ sectionName: mapping.sectionName, fieldName: mapping.fieldName, added: true });
    }
  }

  // Check for modified mappings
  for (const [key, mapping2] of map2) {
    const mapping1 = map1.get(key);
    if (mapping1) {
      const changes: Record<string, FieldChange> = {};

      if (mapping1.description !== mapping2.description) {
        changes.description = { old: mapping1.description, new: mapping2.description };
      }
      if (mapping1.apiName !== mapping2.apiName) {
        changes.apiName = { old: mapping1.apiName, new: mapping2.apiName };
      }
      if (mapping1.fieldMask !== mapping2.fieldMask) {
        changes.fieldMask = { old: mapping1.fieldMask, new: mapping2.fieldMask };
      }
      if (mapping1.fieldPosition !== mapping2.fieldPosition) {
        changes.fieldPosition = { old: mapping1.fieldPosition, new: mapping2.fieldPosition };
      }
      if (mapping1.refSection !== mapping2.refSection) {
        changes.refSection = { old: mapping1.refSection, new: mapping2.refSection };
      }
      if (mapping1.refField !== mapping2.refField) {
        changes.refField = { old: mapping1.refField, new: mapping2.refField };
      }
      if (mapping1.defaultValue !== mapping2.defaultValue) {
        changes.defaultValue = { old: mapping1.defaultValue, new: mapping2.defaultValue };
      }
      if (mapping1.parentValue !== mapping2.parentValue) {
        changes.parentValue = { old: mapping1.parentValue, new: mapping2.parentValue };
      }
      if (mapping1.mappingType !== mapping2.mappingType) {
        changes.mappingType = { old: labelMappingType(mapping1.mappingType), new: labelMappingType(mapping2.mappingType) };
      }
      if (mapping1.mandatory !== mapping2.mandatory) {
        changes.mandatory = { old: mapping1.mandatory ? "Yes" : "No", new: mapping2.mandatory ? "Yes" : "No" };
      }
      if (mapping1.valueForDownload !== mapping2.valueForDownload) {
        changes.valueForDownload = { old: mapping1.valueForDownload || "—", new: mapping2.valueForDownload || "—" };
      }
      if (mapping1.conversions !== mapping2.conversions) {
        changes.conversions = { old: labelConversions(mapping1.conversions), new: labelConversions(mapping2.conversions) };
      }

      if (Object.keys(changes).length > 0) {
        diffs.push({
          sectionName: mapping2.sectionName,
          fieldName: mapping2.fieldName,
          changed: true,
          changes,
        });
      }
    }
  }

  return diffs;
}

/**
 * Compare two legacy fields arrays and return the differences.
 * Uses the same MappingDiff shape for consistency.
 */
function compareLegacyFields(
  fields1: FileTemplateField[] | undefined,
  fields2: FileTemplateField[] | undefined
): MappingDiff[] {
  const f1 = fields1 ?? [];
  const f2 = fields2 ?? [];
  const diffs: MappingDiff[] = [];

  const map1 = new Map(f1.map((f) => [f.name, f]));
  const map2 = new Map(f2.map((f) => [f.name, f]));

  // Removed
  for (const [name] of map1) {
    if (!map2.has(name)) {
      diffs.push({ sectionName: "(legacy)", fieldName: name, removed: true });
    }
  }

  // Added
  for (const [name] of map2) {
    if (!map1.has(name)) {
      diffs.push({ sectionName: "(legacy)", fieldName: name, added: true });
    }
  }

  // Modified
  for (const [name, field2] of map2) {
    const field1 = map1.get(name);
    if (field1) {
      const changes: Record<string, FieldChange> = {};
      if (field1.description !== field2.description) {
        changes.description = { old: field1.description, new: field2.description };
      }
      if (field1.required !== field2.required) {
        changes.required = { old: field1.required, new: field2.required };
      }
      if (field1.type !== field2.type) {
        changes.type = { old: field1.type, new: field2.type };
      }
      if (Object.keys(changes).length > 0) {
        diffs.push({ sectionName: "(legacy)", fieldName: name, changed: true, changes });
      }
    }
  }

  return diffs;
}

/**
 * Compare two file template specs and return a detailed diff result.
 */
export function compareFileTemplates(
  template1: FileTemplateSpec,
  template2: FileTemplateSpec
): FileTemplateDiffResult {
  const metadataChanges: FieldChange[] = [];

  const summaryChange =
    template1.description !== template2.description
      ? { old: template1.description, new: template2.description }
      : undefined;
  if (summaryChange) metadataChanges.push(summaryChange);

  const descriptionChange =
    template1.name !== template2.name
      ? { old: template1.name, new: template2.name }
      : undefined;

  const formatChange =
    template1.format !== template2.format
      ? { old: template1.format, new: template2.format }
      : undefined;
  if (formatChange) metadataChanges.push(formatChange);

  const apiTypeChange =
    template1.apiType !== template2.apiType
      ? { old: template1.apiType, new: template2.apiType }
      : undefined;
  if (apiTypeChange) metadataChanges.push(apiTypeChange);

  const apiNameChange =
    template1.apiName !== template2.apiName
      ? { old: template1.apiName, new: template2.apiName }
      : undefined;
  if (apiNameChange) metadataChanges.push(apiNameChange);

  const applicationChange =
    template1.application !== template2.application
      ? { old: template1.application, new: template2.application }
      : undefined;
  if (applicationChange) metadataChanges.push(applicationChange);

  const sampleContentChange =
    template1.sampleContent !== template2.sampleContent
      ? { old: template1.sampleContent, new: template2.sampleContent }
      : undefined;
  if (sampleContentChange) metadataChanges.push(sampleContentChange);

  const sectionDiffs = compareSections(template1.sections, template2.sections);
  const mappingDiffs = compareMappings(template1.mappings, template2.mappings);
  const fieldDiffs = compareLegacyFields(template1.fields, template2.fields);

  const sectionsAdded = sectionDiffs.filter((d) => d.added).length;
  const sectionsRemoved = sectionDiffs.filter((d) => d.removed).length;
  const sectionsModified = sectionDiffs.filter((d) => d.changed).length;
  const mappingsAdded = mappingDiffs.filter((d) => d.added).length;
  const mappingsRemoved = mappingDiffs.filter((d) => d.removed).length;
  const mappingsModified = mappingDiffs.filter((d) => d.changed).length;

  return {
    template1,
    template2,
    ...(summaryChange ? { summaryChange } : {}),
    ...(descriptionChange ? { descriptionChange } : {}),
    ...(formatChange ? { formatChange } : {}),
    ...(apiTypeChange ? { apiTypeChange } : {}),
    ...(apiNameChange ? { apiNameChange } : {}),
    ...(applicationChange ? { applicationChange } : {}),
    ...(sampleContentChange ? { sampleContentChange } : {}),
    sectionDiffs,
    mappingDiffs,
    fieldDiffs,
    summary: {
      totalChanges:
        metadataChanges.length +
        sectionsAdded + sectionsRemoved + sectionsModified +
        mappingsAdded + mappingsRemoved + mappingsModified +
        fieldDiffs.length,
      sectionsAdded,
      sectionsRemoved,
      sectionsModified,
      mappingsAdded,
      mappingsRemoved,
      mappingsModified,
      metadataChanges: metadataChanges.length,
    },
  };
}
