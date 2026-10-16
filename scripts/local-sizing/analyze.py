"""Summarize a completed local run; does not contact services or change fixtures."""
import collections
import json
import math
import pathlib
import re
import statistics
import sys

folder = pathlib.Path(sys.argv[1])
rows = [json.loads(line) for line in (folder / 'metrics.jsonl').read_text().splitlines()]
summary_file = folder / 'summary.json'
summary = json.loads((summary_file if summary_file.exists() else folder / 'partial-summary.json').read_text())
phases = collections.defaultdict(list)
for row in rows:
    phases[row['phase']].append(row)
host_info = (folder/'docker-host.txt').read_text() if (folder/'docker-host.txt').exists() else ''
report = {'run': folder.name, 'completed': summary_file.exists(), 'phases': {}, 'jvm': {}, 'limitations': {
    'actualHostWas2GiB': False, 'reservedOsMiBMeasured': False,
    'emulatedAmd64': ('aarch64' in host_info or 'arm64' in host_info), 'oneSecondSamplePeak': True,
    'kernelMemoryPeakFileAvailable': False, 'postgresPssAvailable': False,
    'kernelAggregateMemoryStatAvailable': any(r.get('kernelBytes') is not None for r in rows),
}}
for phase, items in phases.items():
    first, last = items[0], items[-1]
    periods = last['cpu'].get('nr_periods', 0) - first['cpu'].get('nr_periods', 0)
    throttled = last['cpu'].get('nr_throttled', 0) - first['cpu'].get('nr_throttled', 0)
    value = {'sampleCount': len(items), 'observedSeconds': last['time'] - first['time'],
        'averageCpuCores': (last['cpu']['usage_usec']-first['cpu']['usage_usec'])/1e6/(last['time']-first['time']) if last['time']>first['time'] else None,
        'peakMiB': max(r['cgroupBytes'] for r in items) / 1048576,
        'peakAnonMiB': max(r['anonBytes'] for r in items) / 1048576,
        'peakFileMiB': max(r['fileBytes'] for r in items) / 1048576,
        'oomMax': max(r['events'].get('oom', 0) for r in items),
        'oomKillMax': max(r['events'].get('oom_kill', 0) for r in items),
        'maxEventIncrements': last['events'].get('max', 0) - first['events'].get('max', 0),
        'throttledPeriodsPercent': throttled / periods * 100 if periods else None,
        'rssPeakMiBByGroup': {g: max(r['groups'].get(g, {}).get('rssKiB', 0) for r in items) / 1024
                             for g in set().union(*(r['groups'] for r in items))}}
    requests = folder / (phase + '-requests.json')
    if requests.exists():
        req = json.loads(requests.read_text())
        timings = sorted(r['ms'] for r in req if r['operation'] != 'argon2_login')
        value.update({'requestCount': len(req), 'errors': sum(r['status'] != r['expected'] for r in req),
                      'nonLoginP50Ms': statistics.median(timings),
                      'nonLoginP95Ms': timings[math.ceil(len(timings) * .95) - 1],
                      'nonLoginMaxMs': max(timings)})
        value['completedDuringBackup'] = []
        for backup in summary.get('phases', {}).get(phase, {}).get('backup', []):
            if backup.get('success') and 'startedAtUnix' in backup:
                overlap = [r for r in req if backup['startedAtUnix'] <= r.get('finishedAtUnix', 0) <= backup['finishedAtUnix']]
                value['completedDuringBackup'].append({'requestCount': len(overlap),
                    'errors': sum(r['status'] != r['expected'] for r in overlap),
                    'backupSeconds': backup['seconds']})
    report['phases'][phase] = value
for file in folder.glob('*-native.txt'):
    content = file.read_text()
    total = re.search(r'Total: reserved=(\d+)KB, committed=(\d+)KB', content)
    heap = re.search(r'Java Heap \(reserved=(\d+)KB, committed=(\d+)KB\)', content)
    if total and heap:
        report['jvm'][file.stem] = {'nmtCommittedMiB': int(total[2]) / 1024,
            'heapCommittedMiB': int(heap[2]) / 1024,
            'trackedNonHeapCommittedMiB': (int(total[2]) - int(heap[2])) / 1024}
report['overall'] = {'samplePeakMiB': max(r['cgroupBytes'] for r in rows) / 1048576,
    'maxSwapBytes': max(r['swapBytes'] for r in rows),
    'finalEvents': json.loads((folder / 'final-events.json').read_text()),
    'sourceSummary': summary,
    'serviceExitSeenBeforeShutdown': [r for r in rows if r['phase'] != 'shutdown'
                                    and any(code is not None for code in r['serviceExitCodes'].values())]}
(folder / 'analysis.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
