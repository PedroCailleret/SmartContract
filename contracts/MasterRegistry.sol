// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol';
/**
 * Master Registry Contract.
 */
contract MasterRegistry is Initializable, OwnableUpgradeable {

    event RecordChanged(address indexed series, uint16 indexed key, address value);
    event ContentChanged(address indexed series, uint16 indexed key, string value);
    event DocumentTimestamped(address indexed series, uint256 timestamp, string filename, string cid);

    // Mapping PluginID => Pluggin contract address
    mapping(uint16=>address) private plugins;
    // Mapping Series Address => PluginID => Deployd Contract Address 
    mapping(address=>mapping(uint16=>address)) private records;
    // Mapping Series Address => PluginID => Content
    mapping(address=>mapping(uint16=>string)) private contents;

    /**
     * Modifier that only allow the following entities change content:
     * - Series owners
     * - Plugin itself in case of empty series record
     * - Current module itself addressed by record
     * @param _series The plugin index to update.
     * @param _key The new address where remains the plugin.
     */
    modifier authorizedRecord(address _series, uint16 _key) {
        require(isSeriesOwner(_series) ||
        isRecordItself(_series, _key) || 
        isRecordPlugin(_series, _key), "Not authorized");
        _;
    }
    
    /**
     * Modifier to allow only series owners to change content.
     * @param _series The plugin index to update.
     * @param _key The new address where remains the plugin.
     */
    modifier onlySeriesOwner(address _series, uint16 _key) {
        require(isSeriesOwner(_series), "Not authorized");
        _;
    }

    /**
     * Sets the module contract associated with an Series and record.
     * May only be called by the owner of that series, module itself or record plugin itself.
     * @param series The series to update.
     * @param key The key to set.
     * @param value The text data value to set.
     */
    function setRecord(address series, uint16 key, address value) public authorizedRecord(series, key) {
        records[series][key] = value;
        emit RecordChanged(series, key, value);
    }

    /**
     * Returns the data associated with an record Series and Key.
     * @param series The series node to query.
     * @param key The text data key to query.
     * @return The associated text data.
     */
    function getRecord(address series, uint16 key) public view returns (address) {
        return records[series][key];
    }

    /**
     * Sets the content data associated with an Series and key.
     * May only be called by the owner of that series.
     * @param series The series to update.
     * @param key The key to set.
     * @param value The text data value to set.
     */
    function setContent(address series, uint16 key, string memory value) public onlySeriesOwner(series, key) {
        contents[series][key] = value;
        emit ContentChanged(series, key, value);
    }

    /**
     * Returns the content associated with an content Series and Key.
     * @param series The series node to query.
     * @param key The text data key to query.
     * @return The associated text data.
     */
    function getContent(address series, uint16 key) public view returns (string memory) {
        return contents[series][key];
    }

    /**
     * Sets the plugin that controls specific entry on records.
     * Only owner of this contract has permission.
     * @param pluginID The plugin index to update.
     * @param pluginAddress The new address where remains the plugin.
     */
    function setPluginController(uint16 pluginID, address pluginAddress) public onlyOwner {
        plugins[pluginID] = pluginAddress;
    }

    /**
    @notice Sets the module contract associated with an Series and record.
    May only be called by the owner of that series, module itself or record plugin itself.
    @param series The series to update.
    @param cid The hash content to be added.
     */
    function addTimestamp(address series, string memory filename, string memory cid) public onlySeriesOwner(series, 1) {
        //DocumentEntry memory doc = DocumentEntry(value, block.timestamp);
        //timestamps[series].push(doc);
        emit DocumentTimestamped(series, block.timestamp, filename, cid);
    }

    function isSeriesOwner(address _series) private view returns (bool) {
        return OwnableUpgradeable(_series).owner() == _msgSender();
    }

    function isRecordItself(address _series, uint16 _key) private view returns (bool) {
        return records[_series][_key] == _msgSender();
    }

    function isRecordPlugin(address _series, uint16 _key) private view returns (bool) {
        return _msgSender() == plugins[_key] && records[_series][_key] == address(0);
    }
}