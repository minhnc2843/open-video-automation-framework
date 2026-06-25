import type { ProviderCapability, ProviderMetadata } from "@ovaf/contracts";
import { ProviderInfrastructureError } from "./errors.js";
import type { ProviderPlugin } from "./provider-plugin.js";

export class ProviderRegistry {
  private readonly plugins = new Map<string, ProviderPlugin>();

  register(plugin: ProviderPlugin): void {
    validatePlugin(plugin);

    if (this.plugins.has(plugin.metadata.id)) {
      throw new ProviderInfrastructureError(
        "PROVIDER-REGISTRY-001",
        `Provider "${plugin.metadata.id}" is already registered.`
      );
    }

    this.plugins.set(plugin.metadata.id, plugin);
  }

  get(providerId: string): ProviderPlugin | null {
    return this.plugins.get(providerId) ?? null;
  }

  require(providerId: string): ProviderPlugin {
    const plugin = this.get(providerId);
    if (plugin === null) {
      throw new ProviderInfrastructureError("PROVIDER-REGISTRY-001", `Provider "${providerId}" is not registered.`);
    }

    return plugin;
  }

  list(): readonly ProviderMetadata[] {
    return [...this.plugins.values()].map((plugin) => plugin.metadata);
  }

  findByCapability(capability: ProviderCapability): readonly ProviderMetadata[] {
    return this.list().filter((metadata) => metadata.capabilities.includes(capability));
  }
}

function validatePlugin(plugin: ProviderPlugin): void {
  if (plugin.metadata.id.trim().length === 0) {
    throw new ProviderInfrastructureError("PROVIDER-REGISTRY-001", "Provider id is required.");
  }

  if (plugin.metadata.capabilities.length === 0) {
    throw new ProviderInfrastructureError("PROVIDER-REGISTRY-001", "Provider must declare at least one capability.");
  }

  const credentialKeys = new Set<string>();
  for (const descriptor of plugin.credentialDescriptors) {
    if (descriptor.key.trim().length === 0) {
      throw new ProviderInfrastructureError("PROVIDER-REGISTRY-001", "Provider credential descriptor key is required.");
    }

    if (credentialKeys.has(descriptor.key)) {
      throw new ProviderInfrastructureError(
        "PROVIDER-REGISTRY-001",
        `Provider credential descriptor "${descriptor.key}" is duplicated.`
      );
    }

    credentialKeys.add(descriptor.key);
  }
}
