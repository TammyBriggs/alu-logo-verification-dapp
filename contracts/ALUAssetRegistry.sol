// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ALUAssetRegistry
 * @dev Registers the ALU official logo as an NFT and protects its integrity on the blockchain.
 */
contract ALUAssetRegistry is ERC721, Ownable {
    
    // Counter for token IDs
    uint256 private _currentTokenId;

    // Struct to hold asset details
    struct AssetMetadata {
        string assetName;
        string fileType;
        bytes32 contentHash;
        address registeredBy;
        uint256 registrationTimestamp;
    }

    // Mapping from token ID to Asset Metadata
    mapping(uint256 => AssetMetadata) private _tokenMetadata;

    // Mapping to track if a SHA-256 content hash has already been registered
    mapping(bytes32 => bool) private _registeredHashes;

    // Event emitted when a new asset is securely anchored
    event AssetRegistered(
        uint256 indexed tokenId,
        string assetName,
        bytes32 indexed contentHash,
        address indexed registeredBy
    );

    /**
     * @dev Constructor initializes the ERC721 token collection and sets contract owner.
     */
    constructor() ERC721("ALU Logo Registry", "ALULR") Ownable(msg.sender) {}

    /**
     * @notice Registers a unique digital asset on-chain.
     * @param assetName The name of the digital asset.
     * @param fileType The format/extension of the file (e.g., "png", "jpg").
     * @param contentHash The SHA-256 cryptographic hash representing the file's content.
     * @return The unique token ID assigned to the registered asset.
     */
    function registerAsset(
        string calldata assetName,
        string calldata fileType,
        bytes32 contentHash
    ) external returns (uint256) {
        // Enforce that the asset hash cannot be empty
        require(contentHash != bytes32(0), "Content hash cannot be zero");
        
        // Enforce uniqueness: Reject duplicate file registrations
        require(!_registeredHashes[contentHash], "Duplicate asset error: This logo hash has already been registered.");

        // Increment token counter
        _currentTokenId++;
        uint256 newTokenId = _currentTokenId;

        // Mint the unique asset token safely to the caller
        _safeMint(msg.sender, newTokenId);

        // Store the asset metadata immutably in the mapping
        _tokenMetadata[newTokenId] = AssetMetadata({
            assetName: assetName,
            fileType: fileType,
            contentHash: contentHash,
            registeredBy: msg.sender,
            registrationTimestamp: block.timestamp
        });

        // Mark this hash as registered to prevent future duplicates
        _registeredHashes[contentHash] = true;

        // Emit execution event for indexers and frontends
        emit AssetRegistered(newTokenId, assetName, contentHash, msg.sender);

        return newTokenId;
    }

    /**
     * @notice Verifies whether a provided hash matches the registered file signature.
     * @param tokenId The unique identifier of the registered asset.
     * @param suppliedHash The SHA-256 hash generated from the file being verified.
     * @return authentic True if hashes match, false otherwise.
     * @return message Descriptive text indicating authenticity status.
     */
    function verifyLogoIntegrity(uint256 tokenId, bytes32 suppliedHash) 
        external 
        view 
        returns (bool authentic, string memory message) 
    {
        // Check if token exists by verifying metadata registration
        if (_tokenMetadata[tokenId].registrationTimestamp == 0) {
            return (false, "Warning: Token ID does not exist.");
        }

        bytes32 storedHash = _tokenMetadata[tokenId].contentHash;
        
        if (storedHash == suppliedHash) {
            return (true, "Logo is authentic.");
        } else {
            return (false, "Warning: logo does not match.");
        }
    }

    /**
     * @notice Fetch the full metadata payload for a registered token.
     * @param tokenId The unique token ID.
     * @return The complete AssetMetadata structure.
     */
    function getAsset(uint256 tokenId) external view returns (AssetMetadata memory) {
        require(_tokenMetadata[tokenId].registrationTimestamp != 0, "Asset registry query for nonexistent token");
        return _tokenMetadata[tokenId];
    }
}
