import { Eye, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useTeamBalances } from "../api";
import { formatMoney } from "../money";
import type { TeamBalance } from "../types";
import { TeamBalanceDialog } from "./team-balance-dialog";

/** Per-team account statement (charges, paid and pending balance). */
export function FinanceBalances({ leagueId }: { leagueId: string }) {
  const balances = useTeamBalances(leagueId, { limit: 100, offset: 0 });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TeamBalance | null>(null);
  const rows = useMemo(
    () =>
      (balances.data?.data ?? []).filter((b) =>
        b.team_name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [balances.data, search],
  );

  return (
    <>
      <Card className="backdrop-blur-xl bg-white/10 border-white/20">
        <CardHeader>
          <CardTitle className="text-white drop-shadow-lg">
            Estado de Cuenta por Equipo
          </CardTitle>
          <CardDescription className="text-white/70">
            Cargos, pagos y saldo pendiente de cada equipo
          </CardDescription>
          <div className="relative max-w-sm pt-2">
            <Label htmlFor="balance-search" className="sr-only">
              Buscar equipo
            </Label>
            <Search
              className="absolute left-3 top-1/2 mt-1 -translate-y-1/2 w-4 h-4 text-white/50"
              aria-hidden="true"
            />
            <Input
              id="balance-search"
              placeholder="Buscar equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 backdrop-blur-md bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
        </CardHeader>
        <CardContent>
          {balances.isPending ? (
            <LoadingState label="Cargando equipos…" />
          ) : balances.isError ? (
            <ErrorState
              error={balances.error}
              onRetry={() => void balances.refetch()}
            />
          ) : balances.data.data.length === 0 ? (
            <p className="text-white/60 text-center py-8">
              Aún no hay movimientos por equipo
            </p>
          ) : rows.length === 0 ? (
            <p className="text-white/60 text-center py-8">
              No se encontraron equipos
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-white/70">Equipo</TableHead>
                    <TableHead className="text-white/70 text-right">
                      Cargos
                    </TableHead>
                    <TableHead className="text-white/70 text-right">
                      Pagado
                    </TableHead>
                    <TableHead className="text-white/70 text-right">
                      Pendiente
                    </TableHead>
                    <TableHead className="text-white/70 text-right">
                      Vencidos
                    </TableHead>
                    <TableHead className="text-white/70 text-right">
                      Multas
                    </TableHead>
                    <TableHead className="text-white/70 text-right">
                      <span className="sr-only">Detalle</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((b) => (
                    <TableRow
                      key={b.team_id}
                      onClick={() => setSelected(b)}
                      className="border-white/10 hover:bg-white/5 cursor-pointer"
                    >
                      <TableCell className="text-white font-medium">
                        {b.team_name}
                      </TableCell>
                      <TableCell className="text-right text-white/80">
                        {formatMoney(b.total_charges)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-400">
                        {formatMoney(b.total_paid)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${Number(b.pending_balance) > 0 ? "text-red-400" : "text-white/80"}`}
                      >
                        {formatMoney(b.pending_balance)}
                      </TableCell>
                      <TableCell className="text-right text-red-300">
                        {b.overdue_count || "-"}
                      </TableCell>
                      <TableCell className="text-right text-amber-300">
                        {b.pending_fines_count || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Ver estado de cuenta de ${b.team_name}`}
                          className="text-white/70 hover:text-white hover:bg-white/10"
                        >
                          <Eye className="w-4 h-4 mr-2" aria-hidden="true" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {selected && (
        <TeamBalanceDialog
          leagueId={leagueId}
          team={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
