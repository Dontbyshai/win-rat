using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace G2DK.Functionalities.Livestream.Encoding
{
    /// <summary>
    /// Monitors network conditions and adjusts video bitrate accordingly.
    /// </summary>
    public class AdaptiveBitrateController
    {
        public enum QualityTier
        {
            High,    // 2 Mbps - good network conditions
            Medium,  // 1 Mbps - moderate conditions
            Low,     // 500 kbps - poor conditions
            VeryLow  // 200 kbps - very poor conditions
        }

        private const int HighBitrate = 2000000;    // 2 Mbps
        private const int MediumBitrate = 1000000;  // 1 Mbps
        private const int LowBitrate = 500000;       // 500 kbps
        private const int VeryLowBitrate = 200000;   // 200 kbps

        private const double RttThresholdHigh = 100;     // ms - switch to Medium
        private const double RttThresholdMedium = 200;   // ms - switch to Low
        private const double RttThresholdLow = 400;      // ms - switch to VeryLow

        private const double PacketLossThresholdHigh = 2;    // % - switch to Medium
        private const double PacketLossThresholdMedium = 5;  // % - switch to Low
        private const double PacketLossThresholdLow = 10;    // % - switch to VeryLow

        private readonly List<double> _rttHistory = new List<double>();
        private readonly List<double> _packetLossHistory = new List<double>();
        private readonly int _historySize = 10;
        private readonly object _lock = new object();

        private QualityTier _currentTier = QualityTier.High;
        private int _currentBitrate = HighBitrate;
        private DateTime _lastTierChange = DateTime.MinValue;
        private readonly TimeSpan _tierChangeCooldown = TimeSpan.FromSeconds(5);

        public event Action<int, QualityTier> OnBitrateChanged;

        public int CurrentBitrate => _currentBitrate;
        public QualityTier CurrentTier => _currentTier;

        public AdaptiveBitrateController()
        {
            //Console.WriteLine($"[ABR] Initialized with {_currentTier} tier ({_currentBitrate / 1000} kbps)");
        }

        /// <summary>
        /// Updates the controller with the latest network statistics.
        /// </summary>
        public void UpdateStats(double rttMs, double packetLossPercent)
        {
            lock (_lock)
            {
                // Add to history
                _rttHistory.Add(rttMs);
                _packetLossHistory.Add(packetLossPercent);

                // Keep history bounded
                while (_rttHistory.Count > _historySize)
                    _rttHistory.RemoveAt(0);
                while (_packetLossHistory.Count > _historySize)
                    _packetLossHistory.RemoveAt(0);

                // Calculate averages
                var avgRtt = _rttHistory.Average();
                var avgPacketLoss = _packetLossHistory.Average();

                // Determine target tier
                var targetTier = DetermineTargetTier(avgRtt, avgPacketLoss);

                // Apply tier change with cooldown
                if (targetTier != _currentTier && DateTime.Now - _lastTierChange > _tierChangeCooldown)
                {
                    // Allow quick downgrade but slow upgrade
                    var isDowngrade = targetTier > _currentTier;
                    var isUpgrade = targetTier < _currentTier;

                    if (isDowngrade || (isUpgrade && AllMetricsStableForUpgrade(avgRtt, avgPacketLoss)))
                    {
                        ChangeTier(targetTier);
                    }
                }
            }
        }

        private QualityTier DetermineTargetTier(double avgRtt, double avgPacketLoss)
        {
            // Determine tier based on RTT
            QualityTier rttTier;
            if (avgRtt < RttThresholdHigh)
                rttTier = QualityTier.High;
            else if (avgRtt < RttThresholdMedium)
                rttTier = QualityTier.Medium;
            else if (avgRtt < RttThresholdLow)
                rttTier = QualityTier.Low;
            else
                rttTier = QualityTier.VeryLow;

            // Determine tier based on packet loss
            QualityTier packetLossTier;
            if (avgPacketLoss < PacketLossThresholdHigh)
                packetLossTier = QualityTier.High;
            else if (avgPacketLoss < PacketLossThresholdMedium)
                packetLossTier = QualityTier.Medium;
            else if (avgPacketLoss < PacketLossThresholdLow)
                packetLossTier = QualityTier.Low;
            else
                packetLossTier = QualityTier.VeryLow;

            // Return the worse of the two
            return (QualityTier)Math.Max((int)rttTier, (int)packetLossTier);
        }

        private bool AllMetricsStableForUpgrade(double avgRtt, double avgPacketLoss)
        {
            // Require all recent measurements to be good, not just the average
            if (_rttHistory.Count < _historySize || _packetLossHistory.Count < _historySize)
                return false;

            var targetTier = _currentTier - 1;
            double maxRtt, maxPacketLoss;

            switch (targetTier)
            {
                case QualityTier.High:
                    maxRtt = RttThresholdHigh * 0.8;
                    maxPacketLoss = PacketLossThresholdHigh * 0.8;
                    break;
                case QualityTier.Medium:
                    maxRtt = RttThresholdMedium * 0.8;
                    maxPacketLoss = PacketLossThresholdMedium * 0.8;
                    break;
                case QualityTier.Low:
                    maxRtt = RttThresholdLow * 0.8;
                    maxPacketLoss = PacketLossThresholdLow * 0.8;
                    break;
                default:
                    maxRtt = double.MaxValue;
                    maxPacketLoss = double.MaxValue;
                    break;
            }

            return _rttHistory.All(r => r < maxRtt) && _packetLossHistory.All(p => p < maxPacketLoss);
        }

        private void ChangeTier(QualityTier newTier)
        {
            var oldTier = _currentTier;
            _currentTier = newTier;

            switch (newTier)
            {
                case QualityTier.High:
                    _currentBitrate = HighBitrate;
                    break;
                case QualityTier.Medium:
                    _currentBitrate = MediumBitrate;
                    break;
                case QualityTier.Low:
                    _currentBitrate = LowBitrate;
                    break;
                case QualityTier.VeryLow:
                    _currentBitrate = VeryLowBitrate;
                    break;
                default:
                    _currentBitrate = MediumBitrate;
                    break;
            }

            _lastTierChange = DateTime.Now;

            var direction = newTier > oldTier ? "v" : "^";
            //Console.WriteLine($"[ABR] {direction} Quality changed: {oldTier} -> {newTier} ({_currentBitrate / 1000} kbps)");

            OnBitrateChanged?.Invoke(_currentBitrate, newTier);
        }

        /// <summary>
        /// Gets the target frame rate based on current quality tier.
        /// </summary>
        public int GetTargetFrameRate()
        {
            switch (_currentTier)
            {
                case QualityTier.High:
                    return 30;
                case QualityTier.Medium:
                    return 20;
                case QualityTier.Low:
                    return 15;
                case QualityTier.VeryLow:
                    return 10;
                default:
                    return 15;
            }
        }

        /// <summary>
        /// Gets the target resolution scale factor based on current quality tier.
        /// </summary>
        public float GetResolutionScale()
        {
            switch (_currentTier)
            {
                case QualityTier.High:
                    return 1.0f;
                case QualityTier.Medium:
                    return 0.875f;
                case QualityTier.Low:
                    return 0.75f;
                case QualityTier.VeryLow:
                    return 0.5f;
                default:
                    return 0.75f;
            }
        }

        /// <summary>
        /// Resets the controller to initial high-quality state.
        /// </summary>
        public void Reset()
        {
            lock (_lock)
            {
                _rttHistory.Clear();
                _packetLossHistory.Clear();
                _currentTier = QualityTier.High;
                _currentBitrate = HighBitrate;
                _lastTierChange = DateTime.MinValue;
            }

            //Console.WriteLine("[ABR] Reset to High quality tier");
        }
    }
}
