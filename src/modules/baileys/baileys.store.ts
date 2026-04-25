import {
  BufferJSON,
  initAuthCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from "baileys";
import {
  getAuthKey,
  setManyAuthKeys,
  deleteAuthKeys,
} from "../auth-key/auth-key.service.js";

export async function useDbAuthState(sessionId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
  clearCreds: () => Promise<void>;
}> {
  // ── load creds ────────────────────────────────────────────────────────
  const storedCreds = await getAuthKey(sessionId, "creds");

  const creds: AuthenticationState["creds"] = storedCreds
    ? (JSON.parse(
        JSON.stringify(storedCreds),
        BufferJSON.reviver,
      ) as AuthenticationState["creds"])
    : initAuthCreds();

  // ── keys interface ────────────────────────────────────────────────────
  const keys: AuthenticationState["keys"] = {
    get: async <T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[],
    ): Promise<Record<string, SignalDataTypeMap[T]>> => {
      const result: Record<string, SignalDataTypeMap[T]> = {};

      await Promise.all(
        ids.map(async (id) => {
          const keyId = `${type}-${id}`;
          const raw = await getAuthKey(sessionId, keyId);

          if (raw !== null) {
            result[id] = JSON.parse(
              JSON.stringify(raw),
              BufferJSON.reviver,
            ) as SignalDataTypeMap[T];
          }
        }),
      );

      return result;
    },

    set: async (data: Record<string, Record<string, unknown>>) => {
      const toSave: Record<string, unknown> = {};

      for (const [type, ids] of Object.entries(data)) {
        for (const [id, value] of Object.entries(ids)) {
          const keyId = `${type}-${id}`;
          toSave[keyId] =
            value !== null && value !== undefined
              ? JSON.parse(JSON.stringify(value, BufferJSON.replacer))
              : null;
        }
      }

      // filter null — hapus keys yang di-set null oleh Baileys
      const toDelete = Object.entries(toSave)
        .filter(([, v]) => v === null)
        .map(([k]) => k);

      const toUpsert = Object.fromEntries(
        Object.entries(toSave).filter(([, v]) => v !== null),
      );

      const tasks: Promise<void>[] = [];

      if (Object.keys(toUpsert).length > 0) {
        tasks.push(setManyAuthKeys(sessionId, toUpsert));
      }

      if (toDelete.length > 0) {
        tasks.push(
          ...toDelete.map((keyId) =>
            setManyAuthKeys(sessionId, { [keyId]: null }).catch(() => {
              // ignore jika key tidak ada
            }),
          ),
        );
      }

      await Promise.all(tasks);
    },
  };

  // ── saveCreds ─────────────────────────────────────────────────────────
  const saveCreds = async () => {
    await setManyAuthKeys(sessionId, {
      creds: JSON.parse(JSON.stringify(creds, BufferJSON.replacer)),
    });
  };

  // ── clearCreds ────────────────────────────────────────────────────────
  const clearCreds = async () => {
    await deleteAuthKeys(sessionId);
  };

  return {
    state: { creds, keys },
    saveCreds,
    clearCreds,
  };
}
