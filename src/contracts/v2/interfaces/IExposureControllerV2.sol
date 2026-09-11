// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

interface IExposureControllerV2 {
    function isExposurePaused(address market) external view returns (bool);
}
