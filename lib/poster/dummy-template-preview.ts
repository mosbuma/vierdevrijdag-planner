/**
 * @deprecated Import `renderTemplateEditorPreview` from `@/lib/poster/template-editor-preview` instead.
 * Kept as a thin alias for API routes that refresh the editor preview with dummy data after bulk sync.
 */
import { renderTemplateEditorPreview } from "@/lib/poster/template-editor-preview";
import { TEMPLATE_EDITOR_DUMMY_MEETING_ID } from "@/lib/poster/dummy-template-preview-constants";

export { POSTER_TEMPLATE_DUMMY_MEETUP } from "@/lib/poster/dummy-template-preview-constants";

export async function renderPosterTemplateDummyPreview(posterTemplateId: number): Promise<void> {
  await renderTemplateEditorPreview(posterTemplateId, TEMPLATE_EDITOR_DUMMY_MEETING_ID);
}
