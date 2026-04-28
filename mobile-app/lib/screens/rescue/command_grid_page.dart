import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../models/incident.dart';
import '../../models/rescue_team.dart';
import '../../services/firestore_service.dart';
import '../../services/network_service.dart';
import '../../widgets/tactical_container.dart';
import 'tactical_map_view.dart';
import 'tactical_radar.dart';

class CommandGridPage extends StatefulWidget {
  final VoidCallback onLogout;

  const CommandGridPage({super.key, required this.onLogout});

  @override
  State<CommandGridPage> createState() => _CommandGridPageState();
}

class _CommandGridPageState extends State<CommandGridPage> {
  _GeoSpatialViewMode _geoSpatialViewMode = _GeoSpatialViewMode.map;

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            const ScanlineOverlay(),
            SafeArea(
              child: StreamBuilder<List<Incident>>(
                stream: FirestoreService().tacticalIncidentsStream,
                initialData: FirestoreService().getMergedIncidents(),
                builder: (context, snapshot) {
                  final incidents = snapshot.data ?? [];
                  final criticalCount = incidents.where((i) => i.severity == IncidentSeverity.critical).length;
    
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildHeader(widget.onLogout),
                      _buildStats(incidents.length, criticalCount),
                      const SizedBox(height: 24),
                      
                      // Tab Bar
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 24.0),
                        child: Container(
                          height: 40,
                          decoration: BoxDecoration(
                            color: const Color(0xFF0A0C10),
                            border: Border.all(color: const Color(0xFF1F2937)),
                          ),
                          child: TabBar(
                            indicator: const BoxDecoration(color: Color(0xFF1F2937)),
                            labelColor: Colors.white,
                            unselectedLabelColor: const Color(0xFF475569),
                            labelStyle: GoogleFonts.jetBrainsMono(fontSize: 8, fontWeight: FontWeight.bold),
                            tabs: const [
                              Tab(text: 'PENDING'),
                              Tab(text: 'RESPONDING'),
                              Tab(text: 'COMPLETED'),
                            ],
                          ),
                        ),
                      ),
                      
                      Expanded(
                        child: TabBarView(
                          children: [
                            _buildTabContent(incidents, IncidentStatus.active),
                            _buildTabContent(incidents, IncidentStatus.claimed),
                            _buildTabContent(incidents, IncidentStatus.resolved),
                          ],
                        ),
                      ),
                    ],
                  );
                }
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabContent(List<Incident> allIncidents, IncidentStatus status) {
    final filtered = allIncidents.where((i) => i.status == status).toList();
    
    return SingleChildScrollView(
      child: Column(
        children: [
          const SizedBox(height: 24),
          if (status == IncidentStatus.active) _buildGeoSpatialPanel(allIncidents),
          const SizedBox(height: 24),
          _buildIncidentList(context, filtered),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildHeader(VoidCallback logout) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: StreamBuilder<BridgeMode>(
        stream: NetworkService().modeStream,
        initialData: NetworkService().currentMode,
        builder: (context, snapshot) {
          final mode = snapshot.data ?? BridgeMode.nominal;
          final statusLabel = switch (mode) {
            BridgeMode.nominal => 'SYS_STATUS // NOMINAL',
            BridgeMode.ultraLight => 'SYS_STATUS // DEGRADED',
            BridgeMode.blackout => 'SYS_STATUS // BLACKOUT',
          };
          final statusColor = switch (mode) {
            BridgeMode.nominal => const Color(0xFF10B981),
            BridgeMode.ultraLight => const Color(0xFFF59E0B),
            BridgeMode.blackout => const Color(0xFFF43F5E),
          };

          return Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(statusLabel, style: GoogleFonts.jetBrainsMono(fontSize: 8, color: statusColor, fontWeight: FontWeight.bold)),
                  Text('COMMAND_CENTER_V5', style: GoogleFonts.spaceGrotesk(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white)),
                ],
              ),
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.groups_2_outlined, color: Color(0xFF3B82F6), size: 20),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const TeamControlCenterPage(),
                        ),
                      );
                    },
                  ),
                  IconButton(
                    icon: const Icon(Icons.logout, color: Color(0xFF475569), size: 20),
                    onPressed: logout,
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStats(int total, int critical) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Row(
        children: [
          _StatBox(label: 'QUEUE_DEPTH', value: '$total'),
          const SizedBox(width: 12),
          _StatBox(label: 'CRITICAL_THREAT', value: '$critical', isCritical: true),
          const SizedBox(width: 12),
          StreamBuilder<double>(
            stream: FirestoreService().stabilityStream,
            initialData: FirestoreService().syncStability,
            builder: (context, snapshot) {
              return _StatBox(label: 'SYNC_STABILITY', value: '${snapshot.data?.toStringAsFixed(2)}%');
            }
          ),
        ],
      ),
    );
  }

  Widget _buildGeoSpatialPanel(List<Incident> incidents) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: TacticalContainer(
        borderColor: const Color(0xFF1F2937),
        padding: 12,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'TACTICAL_GEOSPATIAL_VIEW',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 6,
                    color: const Color(0xFF475569),
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const Spacer(),
                _GeoToggleButton(
                  label: 'RADAR',
                  isActive: _geoSpatialViewMode == _GeoSpatialViewMode.radar,
                  onTap: () => setState(
                    () => _geoSpatialViewMode = _GeoSpatialViewMode.radar,
                  ),
                ),
                const SizedBox(width: 8),
                _GeoToggleButton(
                  label: 'MAP',
                  isActive: _geoSpatialViewMode == _GeoSpatialViewMode.map,
                  onTap: () => setState(
                    () => _geoSpatialViewMode = _GeoSpatialViewMode.map,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 320,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                child: _geoSpatialViewMode == _GeoSpatialViewMode.radar
                    ? Center(
                        key: const ValueKey('radar'),
                        child: SizedBox(
                          height: 300,
                          child: TacticalRadar(incidents: incidents),
                        ),
                      )
                    : Container(
                        key: const ValueKey('map'),
                        decoration: BoxDecoration(
                          border: Border.all(color: const Color(0xFF1F2937)),
                        ),
                        child: TacticalMapView(incidents: incidents),
                      ),
              ),
            ),
            const SizedBox(height: 16),
            _LivePacketStream(incidents: incidents),
          ],
        ),
      ),
    );
  }

  Widget _buildIncidentList(BuildContext context, List<Incident> incidents) {
    if (incidents.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(40.0),
          child: Text('[ NO_ACTIVE_SIGNALS ]', style: GoogleFonts.jetBrainsMono(fontSize: 10, color: const Color(0xFF1E293B), fontWeight: FontWeight.bold)),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 0),
      itemCount: incidents.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final inc = incidents[index];
        return _IncidentCard(incident: inc);
      },
    );
  }
}

enum _GeoSpatialViewMode { radar, map }

class _GeoToggleButton extends StatelessWidget {
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _GeoToggleButton({
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = isActive ? const Color(0xFF3B82F6) : const Color(0xFF475569);

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isActive
              ? const Color(0xFF3B82F6).withValues(alpha: 0.12)
              : Colors.transparent,
          border: Border.all(color: color),
        ),
        child: Text(
          label,
          style: GoogleFonts.jetBrainsMono(
            fontSize: 7,
            color: color,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final bool isCritical;

  const _StatBox({required this.label, required this.value, this.isCritical = false});

  @override
  Widget build(BuildContext context) {
    final color = isCritical ? const Color(0xFFF43F5E) : const Color(0xFF3B82F6);
    return Expanded(
      child: TacticalContainer(
        padding: 12,
        borderColor: color,
        showGlow: isCritical,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: GoogleFonts.jetBrainsMono(fontSize: 6, color: const Color(0xFF475569), fontWeight: FontWeight.bold)),
            Text(value, style: GoogleFonts.jetBrainsMono(fontSize: 16, fontWeight: FontWeight.w900, color: isCritical ? color : Colors.white)),
          ],
        ),
      ),
    );
  }
}

class _IncidentCard extends StatelessWidget {
  final Incident incident;

  const _IncidentCard({required this.incident});

  String _formatCoordinate(double value) => value.toStringAsFixed(6);

  void _showDispatchPanel(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => _DispatchPanel(incident: incident),
    );
  }

  @override
  Widget build(BuildContext context) {
    final color = incident.severity == IncidentSeverity.critical ? const Color(0xFFF43F5E) : const Color(0xFF3B82F6);
    final isClaimed = incident.status == IncidentStatus.claimed;
    final isResolved = incident.status == IncidentStatus.resolved;
    final relayLabel = incident.synced ? 'UPLINKED' : 'BUFFERED';
    final relayColor = incident.synced ? const Color(0xFF10B981) : const Color(0xFFF59E0B);

    return TacticalContainer(
      padding: 0,
      borderColor: isResolved ? const Color(0xFF10B981) : color,
      showGlow: incident.severity == IncidentSeverity.critical && !isResolved,
      child: Opacity(
        opacity: isResolved ? 0.6 : 1.0,
        child: IntrinsicHeight(
          child: Row(
            children: [
              Container(
                width: 32,
                color: isResolved
                    ? const Color(0xFF10B981).withValues(alpha: 0.8)
                    : color.withValues(alpha: 0.8),
                alignment: Alignment.center,
                child: RotatedBox(
                  quarterTurns: 3,
                  child: Text(isResolved ? 'RESOLVED' : incident.severity.name.toUpperCase(), style: GoogleFonts.jetBrainsMono(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.black)),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('REF_ID: ${incident.id}', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: isResolved ? const Color(0xFF10B981) : color, fontWeight: FontWeight.bold)),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                                decoration: BoxDecoration(
                                  color: relayColor.withValues(alpha: 0.12),
                                  border: Border.all(color: relayColor.withValues(alpha: 0.4)),
                                ),
                                child: Text(
                                  relayLabel,
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 7,
                                    color: relayColor,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text('REC_T: ${incident.timestamp.hour}:${incident.timestamp.minute.toString().padLeft(2, '0')}', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF475569))),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Text(incident.category, style: GoogleFonts.jetBrainsMono(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                      if (incident.phoneNumber != null)
                         Padding(
                           padding: const EdgeInsets.only(top: 4.0),
                           child: Row(
                             children: [
                               const Icon(Icons.phone, size: 8, color: Color(0xFF3B82F6)),
                               const SizedBox(width: 4),
                               Text(incident.phoneNumber!, style: GoogleFonts.jetBrainsMono(fontSize: 10, color: const Color(0xFF3B82F6), fontWeight: FontWeight.bold)),
                             ],
                           ),
                         ),
                      if (incident.description != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Text(incident.description!, style: GoogleFonts.jetBrainsMono(fontSize: 10, color: const Color(0xFF10B981), fontStyle: FontStyle.italic)),
                        ),
                      const SizedBox(height: 8),
                      Text('SIGNAL: ${incident.rawPacket}', style: GoogleFonts.jetBrainsMono(fontSize: 10, color: const Color(0xFF475569))),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.my_location, size: 10, color: Color(0xFF3B82F6)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Wrap(
                              spacing: 12,
                              runSpacing: 4,
                              children: [
                                Text(
                                  'LAT: ${_formatCoordinate(incident.latitude)}',
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 9,
                                    color: const Color(0xFF3B82F6),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  'LON: ${_formatCoordinate(incident.longitude)}',
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 9,
                                    color: const Color(0xFF3B82F6),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      if (isResolved)
                         Row(
                           children: [
                             const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 12),
                             const SizedBox(width: 8),
                             Text('MISSION_SUCCESSFUL // UNITS_RETURNED', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF10B981), fontWeight: FontWeight.bold)),
                           ],
                         )
                      else if (isClaimed)
                        Container(
                          padding: const EdgeInsets.all(12),
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: color.withValues(alpha: 0.05),
                            border: Border.all(color: color.withValues(alpha: 0.2)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('MISSION_ACTIVE', style: GoogleFonts.jetBrainsMono(fontSize: 6, color: color, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Text('TEAM: ${incident.claimedBy}', style: GoogleFonts.jetBrainsMono(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                              Text('UNITS: ${incident.recResponders}X PERSONNEL', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF475569))),
                              if (incident.autoResolveAt != null)
                                Text(
                                  'AUTO_COMPLETE: 45_SEC_WINDOW',
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 8,
                                    color: const Color(0xFF3B82F6),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                height: 32,
                                child: OutlinedButton(
                                  onPressed: () => FirestoreService().resolveIncident(incident.id),
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: const Color(0xFF10B981),
                                    side: const BorderSide(color: Color(0xFF10B981)),
                                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                                  ),
                                  child: Text('MARK_AS_RESOLVED', style: GoogleFonts.jetBrainsMono(fontSize: 8, fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        SizedBox(
                          width: double.infinity,
                          height: 40,
                          child: ElevatedButton(
                            onPressed: () => _showDispatchPanel(context),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: color.withValues(alpha: 0.1),
                              foregroundColor: color,
                              side: BorderSide(color: color.withValues(alpha: 0.5)),
                              shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                            ),
                            child: Text('INITIATE_DISPATCH_SEQUENCE', style: GoogleFonts.jetBrainsMono(fontSize: 8, fontWeight: FontWeight.bold)),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _LivePacketStream extends StatelessWidget {
  final List<Incident> incidents;

  const _LivePacketStream({required this.incidents});

  @override
  Widget build(BuildContext context) {
    final latest = incidents.take(6).toList();

    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF05070A),
        border: Border.all(color: const Color(0xFF1F2937)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 8),
            child: Text(
              'LIVE_DATA_PACKETS',
              style: GoogleFonts.jetBrainsMono(
                fontSize: 6,
                color: const Color(0xFF475569),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (latest.isEmpty)
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                'WAITING_FOR_UPLINK',
                style: GoogleFonts.jetBrainsMono(
                  fontSize: 8,
                  color: const Color(0xFF1E293B),
                  fontWeight: FontWeight.bold,
                ),
              ),
            )
          else
            ...latest.map((incident) {
              final statusColor = incident.synced
                  ? const Color(0xFF10B981)
                  : const Color(0xFFF59E0B);
              final statusText = incident.synced ? 'UPLINKED' : 'BUFFERED';

              return Padding(
                padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
                child: Row(
                  children: [
                    SizedBox(
                      width: 74,
                      child: Text(
                        '[${incident.timestamp.hour.toString().padLeft(2, '0')}:${incident.timestamp.minute.toString().padLeft(2, '0')}]',
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 8,
                          color: const Color(0xFF475569),
                        ),
                      ),
                    ),
                    Expanded(
                      child: Text(
                        incident.rawPacket,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.jetBrainsMono(
                          fontSize: 8,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      statusText,
                      style: GoogleFonts.jetBrainsMono(
                        fontSize: 8,
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _DispatchPanel extends StatefulWidget {
  final Incident incident;

  const _DispatchPanel({required this.incident});

  @override
  State<_DispatchPanel> createState() => _DispatchPanelState();
}

class _DispatchPanelState extends State<_DispatchPanel> {
  String? _selectedTeamId;
  int _responderCount = 0;

  @override
  void initState() {
    super.initState();
    _responderCount = widget.incident.recResponders ?? 2;
    _selectedTeamId = widget.incident.recTeamType == 'MEDICAL_EVAC' ? 'MEDICAL_SIERRA' : 
                      widget.incident.recTeamType == 'HEAVY_RESCUE' ? 'HEAVY_BRAVO' : 'STRIKE_ALPHA';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Color(0xFF05070A),
        border: Border(top: BorderSide(color: Color(0xFF1F2937), width: 2)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('DISPATCH_CONFIGURATION', style: GoogleFonts.spaceGrotesk(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
          Text('AI_GUIDED_OPS_PLANNING', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF3B82F6), fontWeight: FontWeight.bold)),
          const SizedBox(height: 24),
          
          // AI Recommendation Box
          TacticalContainer(
            borderColor: const Color(0xFF10B981),
            child: Row(
              children: [
                const Icon(Icons.psychology_outlined, color: Color(0xFF10B981), size: 24),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('AI_RECOMMENDATION', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF10B981), fontWeight: FontWeight.bold)),
                      Text('SUGGESTED: ${widget.incident.recTeamType} // ${widget.incident.recResponders}X UNITS', 
                        style: GoogleFonts.jetBrainsMono(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          Text('SELECT_RESPONSE_UNIT', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF475569), fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          StreamBuilder<List<RescueTeam>>(
            stream: FirestoreService().teamRosterStream,
            initialData: FirestoreService().teamRoster,
            builder: (context, rosterSnapshot) {
              final teams = rosterSnapshot.data ?? const <RescueTeam>[];
              final fallbackTeamId = teams.isNotEmpty ? teams.first.id : null;
              final activeTeamId = _selectedTeamId ?? fallbackTeamId;

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: teams.map((team) {
                      final isSelected = activeTeamId == team.id;
                      return InkWell(
                        onTap: () => setState(() => _selectedTeamId = team.id),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFF3B82F6).withValues(alpha: 0.1)
                                : Colors.transparent,
                            border: Border.all(color: isSelected ? const Color(0xFF3B82F6) : const Color(0xFF1F2937)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                team.displayName,
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 10,
                                  color: isSelected ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                              Text(
                                'CAP: ${team.capacity}',
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 7,
                                  color: const Color(0xFF475569),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 24),
                  Text('RESPONDER_COUNT', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: const Color(0xFF475569), fontWeight: FontWeight.bold)),
                  StreamBuilder<Map<String, int>>(
                    stream: FirestoreService().unitsStream,
                    initialData: FirestoreService().teamUnits,
                    builder: (context, snapshot) {
                      final teamAvailable = snapshot.data?[activeTeamId] ?? 0;
                      final canDispatch = activeTeamId != null &&
                          teamAvailable >= _responderCount &&
                          _responderCount > 0;

                      return Column(
                        children: [
                          Row(
                            children: [
                              IconButton(onPressed: () => setState(() => _responderCount = (_responderCount - 1).clamp(1, 20)), icon: const Icon(Icons.remove, color: Colors.white)),
                              Text('$_responderCount', style: GoogleFonts.jetBrainsMono(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
                              IconButton(onPressed: () => setState(() => _responderCount = (_responderCount + 1).clamp(1, 20)), icon: const Icon(Icons.add, color: Colors.white)),
                              const Spacer(),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('TEAM_AVAIL: $teamAvailable', style: GoogleFonts.jetBrainsMono(fontSize: 8, color: teamAvailable > 0 ? const Color(0xFF10B981) : Colors.red)),
                                  if (teamAvailable < _responderCount)
                                     Text('INSUFFICIENT_UNITS', style: GoogleFonts.jetBrainsMono(fontSize: 6, color: Colors.red, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 40),
                          SizedBox(
                            width: double.infinity,
                            height: 60,
                            child: ElevatedButton(
                              onPressed: canDispatch ? () async {
                                final success = await FirestoreService().claimIncident(
                                  widget.incident.id,
                                  activeTeamId,
                                  _responderCount,
                                );
                                if (success && context.mounted) {
                                  Navigator.pop(context);
                                }
                              } : null,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF3B82F6),
                                disabledBackgroundColor: const Color(0xFF1E293B),
                                foregroundColor: Colors.white,
                                shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                              ),
                              child: Text(canDispatch ? 'CONFIRM_DISPATCH' : 'SYSTEM_LOCKED', style: GoogleFonts.spaceGrotesk(fontWeight: FontWeight.w900, letterSpacing: 1)),
                            ),
                          ),
                        ],
                      );
                    }
                  ),
                ],
              );
            },
          ),
          const SizedBox(height: 20),
        ],
      ),
    );
  }
}

class TeamControlCenterPage extends StatefulWidget {
  const TeamControlCenterPage({super.key});

  @override
  State<TeamControlCenterPage> createState() => _TeamControlCenterPageState();
}

class _TeamControlCenterPageState extends State<TeamControlCenterPage> {
  late List<RescueTeam> _draftTeams;
  late List<TextEditingController> _nameControllers;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _draftTeams = FirestoreService().teamRoster
        .map((team) => team.copyWith())
        .toList();
    _nameControllers = _draftTeams
        .map((team) => TextEditingController(text: team.displayName))
        .toList();
  }

  @override
  void dispose() {
    for (final controller in _nameControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _saveTeams() async {
    setState(() => _saving = true);
    final updatedTeams = <RescueTeam>[];

    for (var index = 0; index < _draftTeams.length; index++) {
      updatedTeams.add(
        _draftTeams[index].copyWith(
          displayName: _nameControllers[index].text.trim().isEmpty
              ? _draftTeams[index].id
              : _nameControllers[index].text.trim(),
        ),
      );
    }

    await FirestoreService().updateTeamRoster(updatedTeams);
    if (!mounted) return;
    setState(() => _saving = false);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'TEAM_CONTROL_WINDOW',
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          'DYNAMIC_UNIT_CONFIGURATION',
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 8,
                            color: const Color(0xFF3B82F6),
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close, color: Color(0xFF475569)),
                  ),
                ],
              ),
            ),
            Expanded(
              child: StreamBuilder<Map<String, int>>(
                stream: FirestoreService().unitsStream,
                initialData: FirestoreService().teamUnits,
                builder: (context, unitsSnapshot) {
                  final availability = unitsSnapshot.data ?? const <String, int>{};
                  return ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    itemCount: _draftTeams.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 16),
                    itemBuilder: (context, index) {
                      final team = _draftTeams[index];
                      final available = availability[team.id] ?? team.capacity;
                      final committed = (team.capacity - available).clamp(0, team.capacity);

                      return TacticalContainer(
                        borderColor: const Color(0xFF1F2937),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              team.id,
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 8,
                                color: const Color(0xFF3B82F6),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _nameControllers[index],
                              style: GoogleFonts.jetBrainsMono(color: Colors.white),
                              decoration: InputDecoration(
                                labelText: 'TEAM_NAME',
                                labelStyle: GoogleFonts.jetBrainsMono(
                                  color: const Color(0xFF475569),
                                  fontSize: 10,
                                ),
                                enabledBorder: const OutlineInputBorder(
                                  borderSide: BorderSide(color: Color(0xFF1F2937)),
                                ),
                                focusedBorder: const OutlineInputBorder(
                                  borderSide: BorderSide(color: Color(0xFF3B82F6)),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Text(
                                  'CAPACITY',
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 8,
                                    color: const Color(0xFF475569),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                IconButton(
                                  onPressed: () {
                                    setState(() {
                                      _draftTeams[index] = team.copyWith(
                                        capacity: (team.capacity - 1).clamp(1, 50),
                                      );
                                    });
                                  },
                                  icon: const Icon(Icons.remove, color: Colors.white),
                                ),
                                Text(
                                  '${team.capacity}',
                                  style: GoogleFonts.jetBrainsMono(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                ),
                                IconButton(
                                  onPressed: () {
                                    setState(() {
                                      _draftTeams[index] = team.copyWith(
                                        capacity: (team.capacity + 1).clamp(1, 50),
                                      );
                                    });
                                  },
                                  icon: const Icon(Icons.add, color: Colors.white),
                                ),
                                const Spacer(),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      'AVAILABLE: $available',
                                      style: GoogleFonts.jetBrainsMono(
                                        fontSize: 8,
                                        color: const Color(0xFF10B981),
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Text(
                                      'COMMITTED: $committed',
                                      style: GoogleFonts.jetBrainsMono(
                                        fontSize: 8,
                                        color: const Color(0xFFF43F5E),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _saving ? null : _saveTeams,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF3B82F6),
                    disabledBackgroundColor: const Color(0xFF1E293B),
                    foregroundColor: Colors.white,
                    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.zero),
                  ),
                  child: Text(
                    _saving ? 'SAVING_TEAM_MATRIX' : 'SAVE_TEAM_CONFIGURATION',
                    style: GoogleFonts.spaceGrotesk(
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
