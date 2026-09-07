import { DetailSection } from "@/components/shared/detail-section";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { ActivityList } from "@/modules/sourcing/components/shared/activity-list";
import { NotesPanel } from "@/modules/sourcing/components/shared/notes-panel";

import type { ProjectDetail } from "../types";

export function ActivityTab({ detail, dict, locale }: { detail: ProjectDetail; dict: Dictionary; locale: Locale }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" data-guide="projects-activity">
      <DetailSection title={dict.projects.activity.notes}>
        <NotesPanel entityType="project" entityId={detail.project.id} notes={detail.notes} />
      </DetailSection>
      <DetailSection title={dict.projects.activity.title}>
        <ActivityList entries={detail.activity} dict={dict} locale={locale} />
      </DetailSection>
    </div>
  );
}
