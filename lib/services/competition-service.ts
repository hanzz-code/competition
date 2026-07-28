import { supabaseBrowser } from "@/lib/supabase-browser";
import { Competition, CompetitionListItem } from "@/types/competition";

export const competitionService = {
  /**
   * Fetch all competitions authorized for the logged-in user via RLS.
   * RLS automatically returns only competitions created by the user or where they are staff.
   */
  async getAuthorizedCompetitions(): Promise<CompetitionListItem[]> {
    // We join competition_participants to get the count of players registered
    const { data, error } = await supabaseBrowser
      .from("competitions")
      .select(`
        id, title, slug, status, registration_start_date, registration_end_date, final_end_date, poster_url, category,
        organizations:organization_id(name),
        creator:profiles!creator_id(fullname, username),
        participants:competition_participants(count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching competitions:", error.message, "| Details:", error.details, "| Hint:", error.hint);
      throw error;
    }

    return (data || []).map((d: any) => {
      let organizerName = "Regional Competition";
      if (d.organizations) {
        organizerName = d.organizations.name;
      } else if (d.creator) {
        organizerName = d.creator.fullname || d.creator.username || "Regional Competition";
      }

      return {
        id: d.id,
        title: d.title,
        slug: d.slug,
        status: d.status,
        regStartDate: d.registration_start_date,
        regEndDate: d.registration_end_date,
        finalEndDate: d.final_end_date,
        posterUrl: d.poster_url,
        category: d.category,
        participantCount: d.participants?.[0]?.count || 0,
        organizerName,
      };
    });
  },

  /**
   * Fetch a single competition by ID
   */
  async getCompetitionById(id: string): Promise<Competition> {
    const { data, error } = await supabaseBrowser
      .from("competitions")
      .select(`
        *,
        organizations:organization_id(name),
        creator:profiles!creator_id(fullname, username)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;

    const comp = data as any;
    let organizerName = "Regional Competition";
    if (comp.organizations) {
      organizerName = comp.organizations.name;
    } else if (comp.creator) {
      organizerName = comp.creator.fullname || comp.creator.username || "Regional Competition";
    }

    return {
      ...comp,
      organizerName,
    } as Competition;
  },

  /**
   * Create a new competition
   */
  async createCompetition(payload: Partial<Competition> & { creator_id: string }): Promise<Competition> {
    const { data, error } = await supabaseBrowser
      .from("competitions")
      .insert({
        ...payload,
        status: payload.status || "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating competition:", error);
      throw error;
    }
    return data as Competition;
  },

  /**
   * Update an existing competition
   */
  async updateCompetition(id: string, payload: Partial<Competition>): Promise<Competition> {
    const { data, error } = await supabaseBrowser
      .from("competitions")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating competition:", error);
      throw error;
    }
    return data as Competition;
  },

  /**
   * Delete a competition and its related data
   */
  async deleteCompetition(id: string): Promise<void> {
    // Delete related data in order (foreign key constraints)
    const tables = [
      "competition_group_members",
      "competition_groups",
      "competition_staff",
      "competition_participants",
    ];

    for (const table of tables) {
      const { error } = await supabaseBrowser
        .from(table)
        .delete()
        .eq("competition_id", id);
      if (error) {
        console.error(`Error deleting ${table}:`, error.message);
      }
    }

    // Delete the competition itself
    const { error } = await supabaseBrowser
      .from("competitions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting competition:", error.message);
      throw error;
    }
  },

  /**
   * Fetch active categories
   */
  async getCompetitionCategories(): Promise<string[]> {
    const { data, error } = await supabaseBrowser
      .from("competition_categories")
      .select("name")
      .eq("status", "active")
      .order("name");

    if (error) {
      console.error("Error fetching categories:", error.message);
      return [];
    }
    return (data || []).map((d: any) => d.name);
  },

  /**
   * Create auto-generated groups
   */
  async createCompetitionGroups(groups: any[]): Promise<void> {
    const { error } = await supabaseBrowser
      .from("competition_groups")
      .insert(groups);
    
    if (error) {
      console.error("Error creating competition groups:", error.message);
      throw error;
    }
  },

  /**
   * Fetch roles for an organization to populate the staff role dropdown.
   */
  async getCompetitionRoles(orgId: string): Promise<any[]> {
    const { data, error } = await supabaseBrowser
      .from("roles")
      .select("id, name, description")
      .eq("organization_id", orgId)
      .order("name");

    if (error) {
      console.error("Error fetching roles:", error.message);
      return [];
    }
    return data || [];
  }
};
