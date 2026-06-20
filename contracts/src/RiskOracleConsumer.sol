// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

/// @title RiskOracleConsumer
/// @notice Fetches NASA POWER climate data on-chain via Chainlink Functions.
///         Provides verifiable solar irradiance and precipitation signals
///         for carbon project risk assessment.
///         ownerFulfill() enables demo mode when Chainlink Functions testnet is unavailable.
contract RiskOracleConsumer is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    // ── Chainlink Functions Config ──────────────────────────────────────
    bytes32 public donId;
    uint64  public subscriptionId;
    uint32  public gasLimit = 300_000;

    // ── Oracle JavaScript source (stored on-chain) ──────────────────────
    string public oracleSource;

    // ── Request tracking ────────────────────────────────────────────────
    mapping(bytes32 => uint256) public requestToProjectId;

    // ── Fulfilled results ───────────────────────────────────────────────
    struct OracleData {
        uint256 solarScaled;   // solar kWh/m²/day × 100  (e.g. 483 = 4.83)
        uint256 precipScaled;  // precipitation mm/day × 100 (e.g. 351 = 3.51)
        uint256 fulfilledAt;   // block.timestamp
        bool    fulfilled;
    }
    mapping(uint256 => OracleData) public projectOracleData;

    // ── Error tracking ──────────────────────────────────────────────────
    mapping(bytes32 => bytes) public lastErrors;

    // ── Events ──────────────────────────────────────────────────────────
    event OracleRequested(uint256 indexed projectId, bytes32 indexed requestId, string lat, string lon);
    event OracleFulfilled(uint256 indexed projectId, uint256 solarScaled, uint256 precipScaled);
    event OracleError(uint256 indexed projectId, bytes32 indexed requestId, bytes err);

    // ── Sepolia constants ────────────────────────────────────────────────
    // Chainlink Functions Router on Sepolia
    address public constant SEPOLIA_ROUTER = 0xb83E47C2bC239B3bf370bc41e1459A34b41238D0;
    // DON ID: "fun-ethereum-sepolia-1" as bytes32
    bytes32 public constant SEPOLIA_DON_ID =
        0x66756e2d657468657265756d2d7365706f6c69612d3100000000000000000000;

    constructor(
        address router,
        bytes32 _donId,
        uint64  _subscriptionId,
        string memory _oracleSource
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {
        donId          = _donId;
        subscriptionId = _subscriptionId;
        oracleSource   = _oracleSource;
    }

    /// @notice Request NASA POWER climate data for a project location.
    function requestOracleData(
        uint256 projectId,
        string calldata lat,
        string calldata lon
    ) external onlyOwner returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(oracleSource);

        string[] memory args = new string[](2);
        args[0] = lat;
        args[1] = lon;
        req.setArgs(args);

        requestId = _sendRequest(req.encodeCBOR(), subscriptionId, gasLimit, donId);
        requestToProjectId[requestId] = projectId;

        emit OracleRequested(projectId, requestId, lat, lon);
    }

    /// @dev Chainlink Functions callback — decode packed uint256 → solar + precip
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        uint256 projectId = requestToProjectId[requestId];

        if (err.length > 0) {
            lastErrors[requestId] = err;
            emit OracleError(projectId, requestId, err);
            return;
        }

        uint256 packed = abi.decode(response, (uint256));
        uint256 solarScaled  = packed / 100_000;
        uint256 precipScaled = packed % 100_000;

        projectOracleData[projectId] = OracleData({
            solarScaled:  solarScaled,
            precipScaled: precipScaled,
            fulfilledAt:  block.timestamp,
            fulfilled:    true
        });

        emit OracleFulfilled(projectId, solarScaled, precipScaled);
    }

    /// @notice Demo mode: owner writes oracle data directly.
    ///         Chainlink Functions Sepolia testnet sunset June 15, 2026 — use this for demos.
    ///         Data must be fetched from NASA POWER API externally and passed in.
    function ownerFulfill(
        uint256 projectId,
        uint256 solarScaled,
        uint256 precipScaled
    ) external onlyOwner {
        projectOracleData[projectId] = OracleData({
            solarScaled:  solarScaled,
            precipScaled: precipScaled,
            fulfilledAt:  block.timestamp,
            fulfilled:    true
        });
        emit OracleFulfilled(projectId, solarScaled, precipScaled);
    }

    /// @notice Update Chainlink Functions configuration (subscription ID, etc.)
    function updateConfig(
        bytes32 _donId,
        uint64  _subscriptionId,
        uint32  _gasLimit
    ) external onlyOwner {
        donId          = _donId;
        subscriptionId = _subscriptionId;
        gasLimit       = _gasLimit;
    }

    /// @notice Replace the oracle JavaScript source
    function updateSource(string calldata _source) external onlyOwner {
        oracleSource = _source;
    }

    /// @return solar   kWh/m²/day × 100
    /// @return precip  mm/day × 100
    /// @return ts      UNIX timestamp of fulfillment
    /// @return ok      whether oracle has responded
    function getOracleData(uint256 projectId)
        external view
        returns (uint256 solar, uint256 precip, uint256 ts, bool ok)
    {
        OracleData memory d = projectOracleData[projectId];
        return (d.solarScaled, d.precipScaled, d.fulfilledAt, d.fulfilled);
    }
}
