export interface AgentDefinition {
  id: string;
  name: string;
  slug: string;
  description: string;
  configDir: string;
  skillsDir: string;
  configFile: string;
  installMethod: 'symlink' | 'copy' | 'config';
  website: string;
}

export interface AgentCompatibility {
  agentId: string;
  agentName: string;
  compatible: boolean;
  version?: string;
  notes?: string;
}
